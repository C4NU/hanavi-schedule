import { WeeklySchedule, CharacterSchedule, ScheduleItem, ScheduleMemo, WeekEvent } from '@/types/schedule';
import { supabase } from '@/lib/supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';
import { getStartDateFromRange, getMonday } from './date';
import { applyEventsToCells, isValidCanonicalEvent, normalizeEventType } from './events';

// Use the shared client for read paths. Writes must receive an explicitly
// authenticated server client from an API route.
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

export async function saveScheduleToSupabase(
    data: WeeklySchedule,
    client: SupabaseClient,
    opts?: { skipItems?: boolean }
): Promise<{ success: boolean; scheduleId?: string }> {
    const supabaseClient = client;

    try {
        if (!supabaseUrl) {
            console.error('Supabase credentials missing');
            return { success: false };
        }

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
            return { success: false };
        }

        const scheduleId = scheduleData.id;

        // 2. Prepare Items (이벤트 모델 전환: skipItems 시 schedule_items 미기록)
        const itemsToInsert: Record<string, any>[] = [];
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

        // Iterate through all characters
        for (const char of data.characters) {
            // Iterate through all days 
            // The data structure is: char.schedule[dayIndex] -> { time, content, type... }
            // Wait, WeeklySchedule type might vary. Let's assume standard structure.
            // If char.schedule represents days by index 0-6 matching MON-SUN

            // The data structure is: char.schedule { "MON": { time, content... }, "TUE": ... }
            if (char.schedule && !opts?.skipItems) {
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
                            video_url: item.videoUrl,
                            category: item.category ?? null
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
                if (char.birthday !== undefined) updateData.birthday = char.birthday;

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

        if (opts?.skipItems) {
            // 이벤트 모델: schedule_items 미기록 (freeze) — scheduleId만 반환
            return { success: true, scheduleId };
        }

        const { error: itemsError } = await supabaseClient
            .from('schedule_items')
            .upsert(itemsToInsert, { onConflict: 'schedule_id,character_id,day' });

        if (itemsError) {
            console.error('Error saving items to Supabase:', itemsError);
            return { success: false };
        }

        return { success: true, scheduleId };

    } catch (error) {
        console.error('Unexpected error saving to Supabase:', error);
        return { success: false };
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

            if (error) {
                console.error('Error fetching schedule:', error);
                return null;
            }
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

            if (error) {
                console.error('Error fetching active schedule:', error);
                return null;
            }
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

        // 3. Get Items and Memos (IF a schedule exists)
        let itemsData: any[] = [];
        let memosData: any[] = [];
        if (scheduleId) {
            const { data: items, error: itemsError } = await supabase
                .from('schedule_items')
                .select('*')
                .eq('schedule_id', scheduleId);

            if (!itemsError && items) {
                itemsData = items;

                // Fetch Memos for these items
                const itemIds = items.map(i => i.id);
                if (itemIds.length > 0) {
                    const { data: memos, error: memosError } = await supabase
                        .from('schedule_item_memos')
                        .select('*')
                        .in('schedule_item_id', itemIds)
                        .order('created_at', { ascending: true });
                    
                    if (!memosError && memos) {
                        memosData = memos;
                    }
                }
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
                
                // If graduation date is before viewing week's Monday, hide them
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
                        id: item.id, // ID 매핑 추가
                        time: item.time || '',
                        content: item.content || '',
                        type: item.type as any || 'stream',
                        videoUrl: item.video_url || undefined,
                        category: item.category || undefined,
                        memos: memosData
                            .filter((m: any) => m.schedule_item_id === item.id)
                            .map((m: any) => ({
                                id: m.id,
                                schedule_item_id: m.schedule_item_id,
                                content: m.content,
                                created_at: m.created_at
                            }))
                    };
                }
            });

            return {
                id: char.id,
                name: char.name,
                birthday: char.birthday || undefined,
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

        // 6. 이벤트 모델 (v1.10.0): 해당 스케줄의 이벤트 + 참여 멤버 + 게스트 + 메모 조회
        // (1000행 제한 회피: 스케줄/이벤트 ID로 필터링 — 무필터 전체 조회 금지)
        let events: WeekEvent[] | undefined;
        // Keep legacy schedule_items available for public rendering when the
        // canonical event graph cannot be read, but mark the schedule so an
        // administrator cannot serialize that incomplete view back to DB.
        let canonicalEventsStatus: WeeklySchedule['canonicalEventsStatus'] = scheduleId
            ? 'unavailable'
            : undefined;
        if (scheduleId) {
            try {
                let { data: eventRows, error: evErr } = await supabase
                    .from('schedule_events')
                    .select('id, day, start_time, title, type, video_url, category')
                    .eq('schedule_id', scheduleId);
                // Keep canonical fan-out working while the category column
                // migration is rolling out to an existing database.
                if (evErr) {
                    const legacyEventQuery = await supabase
                        .from('schedule_events')
                        .select('id, day, start_time, title, type, video_url')
                        .eq('schedule_id', scheduleId);
                    if (!legacyEventQuery.error) {
                        eventRows = (legacyEventQuery.data || []).map((row) => ({ ...row, category: null }));
                        evErr = null;
                    }
                }
                if (!evErr && eventRows) {
                    const eventIds = eventRows.map((e: { id: string }) => e.id);
                    const memberMap = new Map<string, { character_id: string; role: string }[]>();
                    const guestMap = new Map<string, string[]>();
                    const memoMap = new Map<string, ScheduleMemo[]>();
                    let relationshipError: unknown = null;
                    if (eventIds.length) {
                        const { data: memberRows, error: memErr } = await supabase
                            .from('schedule_event_members')
                            .select('event_id, character_id, role')
                            .in('event_id', eventIds);
                        if (memErr || !memberRows) {
                            relationshipError = memErr || new Error('Canonical event members were not returned');
                        } else {
                            memberRows.forEach((m: { event_id: string; character_id: string; role: string }) => {
                                if (!memberMap.has(m.event_id)) memberMap.set(m.event_id, []);
                                memberMap.get(m.event_id)!.push({ character_id: m.character_id, role: m.role });
                            });
                        }
                        const { data: guestRows, error: guestErr } = await supabase
                            .from('schedule_event_guests')
                            .select('event_id, display_name')
                            .in('event_id', eventIds);
                        if (guestErr || !guestRows) {
                            relationshipError ||= guestErr || new Error('Canonical event guests were not returned');
                        } else {
                            guestRows.forEach((g: { event_id: string; display_name: string }) => {
                                if (!guestMap.has(g.event_id)) guestMap.set(g.event_id, []);
                                guestMap.get(g.event_id)!.push(g.display_name);
                            });
                        }
                        const { data: evMemos, error: memoErr } = await supabase
                            .from('schedule_item_memos')
                            .select('id, event_id, content, created_at')
                            .in('event_id', eventIds)
                            .order('created_at', { ascending: true });
                        if (memoErr || !evMemos) {
                            relationshipError ||= memoErr || new Error('Canonical event memos were not returned');
                        } else {
                            evMemos.forEach((m: { id: string; event_id: string; content: string; created_at: string }) => {
                                if (!m.event_id) return;
                                if (!memoMap.has(m.event_id)) memoMap.set(m.event_id, []);
                                memoMap.get(m.event_id)!.push({ id: m.id, schedule_item_id: '', event_id: m.event_id, content: m.content, created_at: m.created_at });
                            });
                        }
                    }
                    if (!relationshipError) {
                        const knownCharacterIds = new Set(charactersData.map((character) => character.id));
                        const malformedMembership = eventRows.some((event: { id: string; type: string }) => {
                            const memberIds = (memberMap.get(event.id) || []).map((member) => member.character_id);
                            return !isValidCanonicalEvent({
                                type: normalizeEventType(event.type),
                                memberIds,
                            }) || memberIds.some((memberId) => !knownCharacterIds.has(memberId));
                        });
                        if (malformedMembership) {
                            relationshipError = new Error('Canonical event membership is invalid');
                        }
                    }
                    if (relationshipError) {
                        console.warn('Canonical event relationships unavailable:', relationshipError);
                    } else {
                        canonicalEventsStatus = 'available';
                        events = eventRows.map((e: { id: string; day: string; start_time: string | null; title: string; type: string; video_url: string | null; category: string | null }) => ({
                            id: e.id,
                            scheduleId,
                            day: e.day,
                            startTime: e.start_time,
                            title: e.title,
                            type: normalizeEventType(e.type),
                            videoUrl: e.video_url || undefined,
                            category: e.category || undefined,
                            memberIds: (memberMap.get(e.id) || []).map((m) => m.character_id),
                            guests: guestMap.get(e.id) || [],
                            memos: memoMap.get(e.id) || [],
                        }));
                    }
                } else if (evErr) {
                    console.warn('Events fetch skipped:', evErr.message);
                }
            } catch (evError) {
                console.warn('Events fetch error; canonical source is unavailable:', evError);
            }
        }

        // 이벤트 모델: 이벤트가 존재하면 셀을 이벤트에서 파생 (items 대체)
        if (canonicalEventsStatus === 'available' && events) {
            applyEventsToCells(activeCharacters, events);
        }

        return {
            weekRange: effectiveWeekRange,
            scheduleId: scheduleId || undefined,
            characters: activeCharacters,
            ...(scheduleId ? { canonicalEventsStatus } : {}),
            ...(events ? { events } : {})
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
            graduation_date: character.graduationDate || null,
            birthday: character.birthday || null
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
        if (character.birthday !== undefined) updateData.birthday = character.birthday || null;

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

export async function addMemoToSupabase(
    target: { scheduleItemId?: string; eventId?: string },
    content: string
): Promise<{ success: boolean; error?: any }> {
    try {
        const insert: Record<string, unknown> = { content };
        if (target.eventId) insert.event_id = target.eventId;
        else if (target.scheduleItemId) insert.schedule_item_id = target.scheduleItemId;
        else throw new Error('메모 대상 없음');

        const { error } = await supabase
            .from('schedule_item_memos')
            .insert(insert);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('Error adding memo:', error);
        return { success: false, error: error.message };
    }
}
