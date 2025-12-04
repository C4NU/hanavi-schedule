import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    // Note: It's okay if this throws during build time if env vars aren't set, 
    // but it ensures runtime safety.
    // We'll log a warning instead of throwing to prevent build crashes if not used.
    console.warn('Supabase Service Role Key is missing. Admin operations will fail.');
}

export const supabaseAdmin = createClient(
    supabaseUrl || '',
    supabaseServiceRoleKey || '',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
