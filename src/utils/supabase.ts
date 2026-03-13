import { WeeklySchedule, CharacterSchedule, ScheduleItem } from '@/types/schedule';
import { supabase } from '@/lib/supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';
import { getStartDateFromRange, getMonday } from './date';

// Use the shared client which uses the Anon Key (Client-side compatible)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Checks if a user has the 'admin' role.
 * This should be used on the server-side with an Admin client to bypass RLS if necessary,
 * or with a User client if RLS allows reading user_roles.
 */
export async function checkIsAdmin(userId: string, client: SupabaseClient): Promise<boolean> {
    try {
        const { data, error } = await client
            .from('user_roles')
            .select('role')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error checking admin role:', error);
            return false;
        }

        return data?.role === 'admin';
    } catch (error) {
        console.error('Unexpected error in checkIsAdmin:', error);
        return false;
    }
}

export async function saveScheduleToSupabase(data: WeeklySchedule, client?: SupabaseClient): Promise<boolean> {
    const supabaseClient = client || supabase;

    try {
        if (!supabaseUrl) {
            console.error('Supabase credentials missing');
            return false;
        }

        console.log('Saving schedule to Supabase for week:', data.weekRange);

        // 1. Upsert Schedule (to ensure ID exists and is active)
        // We'll search by week_range
        const { data: scheduleData, error: scheduleError } = await supabaseClient
            .from('schedules')
            .upsert({
                week_range: data.weekRange,
                updated_at: new Date().toISOString()
            }, { onConflict: 'week_range' })
            .select()
            .single();

        if (scheduleError) {
            console.error('Error saving schedule to Supabase:', scheduleError);
            return false;
        }

        const scheduleId = scheduleData.id;

        // 2. Prepare Items
        const itemsToInsert: Record<string, any>[] = [];
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

        // Iterate through all characters
        for (const char of data.characters) {
            // Iterate through all days 
            // The data structure is: char.schedule[dayIndex] -> { time, content, type... }
            // Wait, WeeklySchedule type might vary. Let's assume standard structure.
            // If char.schedule represents days by index 0-6 matching MON-SUN

            // The data structure is: char.schedule { "MON": { time, content... }, "TUE": ... }
            if (char.schedule) {
                days.forEach(day => {
                    const item = char.schedule[day];
                    if (item) {
                        itemsToInsert.push({
                            schedule_id: scheduleId,
                            character_id: char.id,
                            day: day,
                            time: item.time,
                            content: item.content,
                            type: item.type || 'stream',
                            video_url: item.videoUrl
                        });
                    }
                });
            }

            // [NEW] Update Character Metadata
            if (char.youtubeUrl || char.youtubeChannelId || char.regularHoliday !== undefined || char.youtubeReplayUrl || char.colorBg || char.colorBorder || char.defaultTime || char.sortOrder !== undefined) {
                // We update the character table directly.
                const updateData: any = {};
                if (char.chzzkUrl !== undefined) updateData.chzzk_url = char.chzzkUrl;
                if (char.cimeUrl !== undefined) updateData.cime_url = char.cimeUrl;
                if (char.youtubeUrl !== undefined) updateData.youtube_url = char.youtubeUrl;
                if (char.youtubeChannelId !== undefined) updateData.youtube_channel_id = char.youtubeChannelId;
                if (char.youtubeReplayUrl !== undefined) updateData.youtube_replay_url = char.youtubeReplayUrl;
                if (char.twitterUrl !== undefined) updateData.twitter_url = char.twitterUrl;
                if (char.regularHoliday !== undefined) updateData.regular_holiday = char.regularHoliday;
                if (char.defaultTime !== undefined) updateData.default_time = char.defaultTime;
                if (char.sortOrder !== undefined) updateData.sort_order = char.sortOrder;
                if (char.colorBg !== undefined) updateData.color_bg = char.colorBg;
                if (char.colorBorder !== undefined) updateData.color_border = char.colorBorder;
                if (char.status !== undefined) updateData.status = char.status;
                if (char.graduationDate !== undefined) updateData.graduation_date = char.graduationDate;

                const { error: charUpdateError } = await supabaseClient
                    .from('characters')
                    .update(updateData)
                    .eq('id', char.id);

                if (charUpdateError) {
                    console.error(`Error updating character ${char.name}:`, charUpdateError);
                }
            }
        }

        // 3. Delete existing items for this schedule & Upsert new ones
        // Since we want to replace the week's data, we can delete by schedule_id first 
        // OR better: upsert based on unique constraint (schedule_id, character_id, day).
        // The schema has: constraint unique_schedule_item unique (schedule_id, character_id, day)

        const { error: itemsError } = await supabaseClient
            .from('schedule_items')
            .upsert(itemsToInsert, { onConflict: 'schedule_id,character_id,day' });

        if (itemsError) {
            console.error('Error saving items to Supabase:', itemsError);
            return false;
        }

        console.log('Successfully saved to Supabase');
        return true;

    } catch (error) {
        console.error('Unexpected error saving to Supabase:', error);
        return false;
    }
}

export async function getScheduleFromSupabase(targetWeekRange?: string): Promise<WeeklySchedule | null> {
    try {
        if (!supabaseUrl) return null;

        // 1. Get Schedule ID and Data
        let scheduleData = null;
        let scheduleId = null;

        if (targetWeekRange) {
            // Fetch Specific Week
            const { data, error } = await supabase
                .from('schedules')
                .select('*')
                .eq('week_range', targetWeekRange)
                .maybeSingle();

            if (data) {
                scheduleData = data;
                scheduleId = data.id;
            }
        } else {
            // Fetch Latest Active
            const { data, error } = await supabase
                .from('schedules')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                scheduleData = data;
                scheduleId = data.id;
            }
        }

        const effectiveWeekRange = scheduleData?.week_range || targetWeekRange || '';
        
        // Use common utility to get reference date (Monday)
        const refDate = effectiveWeekRange 
            ? getStartDateFromRange(effectiveWeekRange)
            : getMonday(new Date());

        // 2. Get All Characters (Always needed to construct template)
        const { data: charactersData, error: charError } = await supabase
            .from('characters')
            .select('*');

        if (charError || !charactersData) {
            console.error('Error fetching characters:', charError);
            return null;
        }

        // 3. Get Items (IF a schedule exists)
        let itemsData: any[] = [];
        if (scheduleId) {
            const { data, error: itemsError } = await supabase
                .from('schedule_items')
                .select('*')
                .eq('schedule_id', scheduleId);

            if (!itemsError && data) {
                itemsData = data;
            }
        }

        // 4. Transform to WeeklySchedule
        const characters: CharacterSchedule[] = charactersData.filter((char: any) => {
            // [FILTER] Hide graduated members if their graduation date is before viewing week's Monday
            if (char.status === 'graduated') {
                if (!char.graduation_date) return false; // 졸업 날짜가 없으면 이미 졸업한 것으로 간주하여 숨김
                
                const gradDate = new Date(char.graduation_date);
                // Reset time to compare only dates
                gradDate.setHours(0, 0, 0, 0);
                const compareDate = new Date(refDate);
                compareDate.setHours(0, 0, 0, 0);
                
                if (gradDate < compareDate) return false;
            }
            return true;
        }).map((char: any) => {
            const charId = char.id;
            const charItems = itemsData?.filter((item: any) => item.character_id === charId) || [];

            // DB-based Regular Holidays
            const dbRegularHolidays = char.regular_holiday
                ? (char.regular_holiday as string).split(',').map(d => d.trim())
                : [];

            // DB-based Default Time
            const dbDefaultTime = char.default_time || '00:00';

            const scheduleObj: { [key: string]: ScheduleItem } = {};
            const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

            days.forEach(day => {
                // Determine Default Time: DB > Fallback
                const defaultTime = dbDefaultTime;

                // Use DB value for holiday
                const isDefaultOff = dbRegularHolidays.includes(day);

                scheduleObj[day] = {
                    time: isDefaultOff ? '' : defaultTime,
                    content: isDefaultOff ? '휴방' : '',
                    type: isDefaultOff ? 'off' : 'stream'
                };
            });

            // Overwrite with actual items from DB if they exist
            charItems.forEach((item: any) => {
                if (item.day) {
                    scheduleObj[item.day] = {
                        time: item.time || '',
                        content: item.content || '',
                        type: item.type as any || 'stream',
                        videoUrl: item.video_url || undefined
                    };
                }
            });

            return {
                id: char.id,
                name: char.name,
                colorTheme: char.color_theme || char.id, // Fallback to ID if theme missing
                avatarUrl: char.avatar_url,
                chzzkUrl: char.chzzk_url,
                cimeUrl: char.cime_url || undefined,
                youtubeUrl: char.youtube_url || undefined,
                youtubeChannelId: char.youtube_channel_id || undefined, // Map from DB
                youtubeReplayUrl: char.youtube_replay_url || undefined,
                twitterUrl: char.twitter_url || undefined,
                regularHoliday: char.regular_holiday || undefined, // Map from DB
                defaultTime: char.default_time || undefined,
                sortOrder: char.sort_order || undefined,
                colorBg: char.color_bg || undefined,
                colorBorder: char.color_border || undefined,
                status: char.status || 'active',
                graduationDate: char.graduation_date || undefined,
                schedule: scheduleObj
            } as CharacterSchedule;
        });

        // Sort characters based on sortOrder
        // If sortOrder is present, sort by it ascending.
        // If missing, fallback to end of list or ID.

        const sortedCharacters = characters.sort((a, b) => {
            // Treat undefined/null sortOrder as Infinity so they go to the end
            const orderA = a.sortOrder !== undefined ? a.sortOrder : 9999;
            const orderB = b.sortOrder !== undefined ? b.sortOrder : 9999;

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            // Fallback to name if sortOrder is equal or missing
            return (a.name || '').localeCompare(b.name || '');
        });

        // 5. [DELETED] Duplicate filtering logic removed to preserve historical data
        const activeCharacters = sortedCharacters;

        return {
            weekRange: effectiveWeekRange,
            characters: activeCharacters
        };

    } catch (error) {
        console.error('Error getting schedule from Supabase:', error);
        return null;
    }
}

export async function addCharacter(character: Omit<CharacterSchedule, 'schedule'>): Promise<{ success: boolean; error?: any }> {
    // 1. Check if ID exists
    const { data: existing } = await supabase
        .from('characters')
        .select('id')
        .eq('id', character.id)
        .single();

    if (existing) {
        return { success: false, error: 'Character ID already exists' };
    }

    // 2. [NEW] Shift sort orders if necessary
    if (character.sortOrder !== undefined) {
        const { error: rpcError } = await supabase.rpc('increment_sort_orders', {
            start_order: character.sortOrder
        });

        if (rpcError) {
            console.error('Error shifting sort orders:', rpcError);
            // We verify if the function exists first. If it doesn't (migration not run), we might fail or just log.
            // Proceeding anyway might cause collision, but it's better than failing completely?
            // Actually, proceeding implies collision. Let's warn.
        }
    }

    // 3. Insert
    const { error } = await supabase
        .from('characters')
        .insert({
            id: character.id,
            name: character.name,
            color_theme: character.colorTheme || character.id, // Use ID as default fallback
            avatar_url: character.avatarUrl,
            chzzk_url: character.chzzkUrl,
            cime_url: character.cimeUrl,
            youtube_url: character.youtubeUrl,
            youtube_channel_id: character.youtubeChannelId,
            youtube_replay_url: character.youtubeReplayUrl,
            twitter_url: character.twitterUrl,
            regular_holiday: character.regularHoliday,
            default_time: character.defaultTime,
            sort_order: character.sortOrder,
            color_bg: character.colorBg,
            color_border: character.colorBorder,
            status: character.status || 'active',
            graduation_date: character.graduationDate || null
        });

    if (error) {
        console.error('Error adding character:', error);
        return { success: false, error };
    }

    return { success: true };
}

export const updateCharacter = async (character: any) => {
    try {
        const updateData: any = {};
        if (character.name !== undefined) updateData.name = character.name;
        if (character.avatarUrl !== undefined) updateData.avatar_url = character.avatarUrl;
        if (character.chzzkUrl !== undefined) updateData.chzzk_url = character.chzzkUrl;
        if (character.cimeUrl !== undefined) updateData.cime_url = character.cimeUrl;
        if (character.youtubeUrl !== undefined) updateData.youtube_url = character.youtubeUrl;
        if (character.youtubeChannelId !== undefined) updateData.youtube_channel_id = character.youtubeChannelId;
        if (character.youtubeReplayUrl !== undefined) updateData.youtube_replay_url = character.youtubeReplayUrl;
        if (character.twitterUrl !== undefined) updateData.twitter_url = character.twitterUrl;
        if (character.regularHoliday !== undefined) updateData.regular_holiday = character.regularHoliday;
        if (character.defaultTime !== undefined) updateData.default_time = character.defaultTime;
        if (character.sortOrder !== undefined) updateData.sort_order = character.sortOrder;
        if (character.colorBg !== undefined) updateData.color_bg = character.colorBg;
        if (character.colorBorder !== undefined) updateData.color_border = character.colorBorder;
        if (character.status !== undefined) updateData.status = character.status;
        if (character.graduationDate !== undefined) updateData.graduation_date = character.graduationDate || null;

        const { error } = await supabase
            .from('characters')
            .update(updateData)
            .eq('id', character.id);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('Error updating character:', error);
        return { success: false, error: error.message };
    }
};

export async function deleteCharacter(id: string): Promise<{ success: boolean; error?: any }> {
    // 1. Get sort_order before deleting
    const { data: char } = await supabase
        .from('characters')
        .select('sort_order')
        .eq('id', id)
        .single();

    // 2. Delete
    const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', id);

    // 3. Shift others down
    if (!error && char?.sort_order) {
        const { error: rpcError } = await supabase.rpc('decrement_sort_orders', {
            removed_order: char.sort_order
        });

        if (rpcError) {
            console.error('Error shifting sort orders (decrement):', rpcError);
        }
    }

    if (error) {
        console.error('Error deleting character:', error);
        return { success: false, error };
    }

    return { success: true };
}
