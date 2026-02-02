import { WeeklySchedule, CharacterSchedule, ScheduleItem } from '@/types/schedule';
import { supabase } from '@/lib/supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';

// Use the shared client which uses the Anon Key (Client-side compatible)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

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
            if (char.youtubeChannelId || char.regularHoliday !== undefined || char.youtubeReplayUrl || char.colorBg || char.colorBorder || char.defaultTime || char.sortOrder !== undefined) {
                // We update the character table directly.
                const updateData: any = {};
                if (char.youtubeChannelId) updateData.youtube_channel_id = char.youtubeChannelId;
                if (char.youtubeReplayUrl) updateData.youtube_replay_url = char.youtubeReplayUrl;
                if (char.regularHoliday !== undefined) updateData.regular_holiday = char.regularHoliday;
                if (char.defaultTime) updateData.default_time = char.defaultTime;
                if (char.sortOrder !== undefined) updateData.sort_order = char.sortOrder;
                if (char.colorBg) updateData.color_bg = char.colorBg;
                if (char.colorBorder) updateData.color_border = char.colorBorder;

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

        let scheduleData = null;
        let scheduleId = null;

        if (targetWeekRange) {
            // Fetch Specific Week
            const { data, error } = await supabase
                .from('schedules')
                .select('*')
                .eq('week_range', targetWeekRange)
                .single();

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
                .single();
            if (data) {
                scheduleData = data;
                scheduleId = data.id;
            }
        }

        const effectiveWeekRange = scheduleData?.week_range || targetWeekRange || '';

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
        const characters: CharacterSchedule[] = charactersData.map((char: any) => {
            const charId = char.id;
            const charItems = itemsData?.filter((item: any) => item.character_id === charId) || [];

            // Define Defaults
            const DEFAULTS: Record<string, { time: string, off: string[] }> = {
                'varessa': { time: '08:00', off: ['THU', 'SUN'] },
                'cherii': { time: '10:00', off: [] },
                'nemu': { time: '12:00', off: ['MON', 'THU'] },
                'maroka': { time: '14:00', off: ['TUE', 'SAT'] },
                'mirai': { time: '15:00', off: ['MON', 'THU'] },
                'aella': { time: '17:00', off: [] },
                'ruvi': { time: '19:00', off: ['WED', 'SUN'] },
                'iriya': { time: '24:00', off: ['TUE', 'SAT'] }
            };

            // DB-based Regular Holidays take precedence over hardcoded defaults
            const dbRegularHolidays = char.regular_holiday
                ? (char.regular_holiday as string).split(',').map(d => d.trim())
                : null;

            // DB-based Default Time
            const dbDefaultTime = char.default_time;

            const scheduleObj: { [key: string]: ScheduleItem } = {};
            const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

            days.forEach(day => {
                const config = DEFAULTS[charId.toLowerCase()] || { time: '00:00', off: [] };

                // Determine Default Time: DB > Config > Fallback
                const defaultTime = dbDefaultTime || config.time;

                // Use DB value if exists, otherwise fallback to config
                const isDefaultOff = dbRegularHolidays
                    ? dbRegularHolidays.includes(day)
                    : config.off.includes(day);

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
                youtubeChannelId: char.youtube_channel_id || undefined, // Map from DB
                youtubeReplayUrl: char.youtube_replay_url || undefined,
                regularHoliday: char.regular_holiday || undefined, // Map from DB
                defaultTime: char.default_time || undefined,
                sortOrder: char.sort_order || undefined,
                colorBg: char.color_bg || undefined,
                colorBorder: char.color_border || undefined,
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

            // Fallback to existing logic or name
            const order = ['varessa', 'cherii', 'nemu', 'maroka', 'mirai', 'aella', 'ruvi', 'iriya'];
            const indexA = order.indexOf(a.id);
            const indexB = order.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;

            return 0;
        });

        return {
            weekRange: effectiveWeekRange,
            characters: sortedCharacters
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
            color_theme: 'universe', // Default fallback
            avatar_url: character.avatarUrl,
            chzzk_url: character.chzzkUrl,
            youtube_channel_id: character.youtubeChannelId,
            youtube_replay_url: character.youtubeReplayUrl,
            regular_holiday: character.regularHoliday,
            default_time: character.defaultTime,
            sort_order: character.sortOrder,
            color_bg: character.colorBg,
            color_border: character.colorBorder
        });

    if (error) {
        console.error('Error adding character:', error);
        return { success: false, error };
    }

    return { success: true };
}

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
