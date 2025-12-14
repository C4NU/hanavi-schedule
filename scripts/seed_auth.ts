
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual Env Loader to avoid dotenv dependency issues
const loadEnv = () => {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, ...value] = line.split('=');
            if (key && value) {
                const val = value.join('=').trim().replace(/^['"](.*)['"]$/, '$1'); // Remove quotes
                if (!process.env[key.trim()]) {
                    process.env[key.trim()] = val;
                }
            }
        });
    }
};

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const DOMAIN = 'hanavi.internal';

const ACCOUNTS = [
    { id: 'admin', role: 'admin', password: process.env.ADMIN_SECRET || '0000' },
    { id: 'varessa', role: 'varessa', password: process.env.MEMBER_SECRET_VARESSA || 'varessa123' },
    { id: 'nemu', role: 'nemu', password: process.env.MEMBER_SECRET_NEMU || 'nemu123' },
    { id: 'maroka', role: 'maroka', password: process.env.MEMBER_SECRET_MAROKA || 'maroka123' },
    { id: 'mirai', role: 'mirai', password: process.env.MEMBER_SECRET_MIRAI || 'mirai123' },
    { id: 'ruvi', role: 'ruvi', password: process.env.MEMBER_SECRET_RUVI || 'ruvi123' },
    { id: 'iriya', role: 'iriya', password: process.env.MEMBER_SECRET_IRIYA || 'iriya123' },
];

async function seedAuth() {
    console.log('🌱 Starting Auth Seed...');

    for (const acc of ACCOUNTS) {
        const email = `${acc.id}@${DOMAIN}`;
        console.log(`Processing ${acc.id} (${email})...`);

        // 1. Check if user exists
        // (Note: listUsers has pagination, assuming small count < 50 for now)
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error('List Users Error:', listError);
            continue;
        }

        let user = users.find(u => u.email === email);

        if (!user) {
            console.log(`Creating user ${acc.id}...`);
            const { data, error: createError } = await supabase.auth.admin.createUser({
                email,
                password: acc.password,
                email_confirm: true // Auto confirm
            });

            if (createError) {
                console.error(`Failed to create ${acc.id}:`, createError.message);
                continue;
            }
            user = data.user;
        } else {
            console.log(`User ${acc.id} already exists. Updating password...`);
            const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
                password: acc.password
            });
            if (updateError) console.error(`Failed to update password for ${acc.id}:`, updateError.message);
        }

        if (user) {
            // 2. Upsert Role
            const { error: roleError } = await supabase
                .from('user_roles')
                .upsert({
                    id: user.id,
                    role: acc.role === 'admin' ? 'admin' : acc.id, // For members, role is their character ID usually, or just 'member'? 
                    // Based on previous code: role was 'admin' OR 'char_id'.
                    // Code: "role === 'admin'" or "role === loggedInChar"
                    // So we store the ID as the role/username. 
                    username: acc.id
                })
                .select();

            if (roleError) {
                console.error(`Failed to set role for ${acc.id}:`, roleError.message);
            } else {
                console.log(`✅ Role linked for ${acc.id}`);
            }
        }
    }

    console.log('✨ Auth Seed Completed!');
}

seedAuth();
