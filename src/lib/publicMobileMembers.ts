import { supabase } from '@/lib/supabaseClient';

const columns = 'id,name,avatar_url,birthday,color_bg,color_border,chzzk_url,cime_url,youtube_url,youtube_channel_id,youtube_replay_url,twitter_url,default_time,regular_holiday,status,graduation_date,sort_order';

export async function getMobileMembers(id?: string) {
    const base = supabase.from('characters').select(columns)
        .or('status.is.null,status.neq.graduated')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name')
        .limit(id ? 1 : 200);
    const { data, error } = await (id ? base.eq('id', id) : base);
    if (error || !data) throw new Error('Public members unavailable');
    return data;
}

export async function getMobileGroupLinks() {
    const { data, error } = await supabase.from('global_settings')
        .select('key,value').like('key', 'group_link_%').order('key').limit(100);
    if (error || !data) throw new Error('Public group links unavailable');
    return data.flatMap(({ key, value }) => {
        if (typeof key !== 'string' || !key.startsWith('group_link_') || typeof value !== 'string') return [];
        try {
            return new URL(value).protocol === 'https:' ? [{ key, value }] : [];
        } catch {
            return [];
        }
    });
}
