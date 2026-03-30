import { NextResponse } from 'next/server';
import { saveScheduleToSupabase, checkIsAdmin, getScheduleFromSupabase } from '@/utils/supabase';
import { createClient } from '@supabase/supabase-js';
import { sendMulticastNotification } from '@/lib/notifications';
import { CharacterSchedule } from '@/types/schedule';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Get Token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];

        // 2. Verify Token
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        // Client for Auth Verification (Anon Key)
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        const { data: { user }, error } = await authClient.auth.getUser(token);
        if (error || !user) {
            console.error('Auth Error:', error?.message);
            return NextResponse.json({ error: 'Unauthorized: Invalid Token' }, { status: 401 });
        }

        // 3. Create Admin Client for Database Operations (Service Role Key)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        // 4. Check Role Permissions (Admin Only)
        const isUserAdmin = await checkIsAdmin(user.id, adminClient);
        if (!isUserAdmin) {
            console.warn(`Unauthorized attempt to save schedule by user: ${user.id} (${user.email})`);
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // [NEW] Get current state for descriptive notification
        const oldSchedule = await getScheduleFromSupabase(body.weekRange);
        
        // Save to Supabase using Admin Client
        console.log(`Saving schedule... User: ${user.id} (${user.email})`);
        const success = await saveScheduleToSupabase(body, adminClient);

        if (success) {
            // Trigger Notification
            try {
                let title = '✨ 스케줄 업데이트 알림';
                let bodyText = '새로운 스케줄이 등록되거나 수정되었습니다. 지금 확인해 보세요!';

                if (oldSchedule) {
                    const changedCharacters: string[] = [];
                    body.characters.forEach((newChar: CharacterSchedule) => {
                        const oldChar = oldSchedule.characters.find(c => c.id === newChar.id);
                        if (!oldChar) return;

                        // Compare schedule stringified to catch any change
                        if (JSON.stringify(oldChar.schedule) !== JSON.stringify(newChar.schedule)) {
                            changedCharacters.push(newChar.name);
                        }
                    });

                    if (changedCharacters.length === 1) {
                        title = `✨ ${changedCharacters[0]} 스케줄 수정`;
                        bodyText = `${changedCharacters[0]}님의 스케줄이 변경되었습니다. 확인해보세요!`;
                    } else if (changedCharacters.length > 1) {
                        const first = changedCharacters[0];
                        const count = changedCharacters.length - 1;
                        bodyText = `${first}님 외 ${count}명의 스케줄이 변경되었습니다.`;
                    }
                } else {
                    // New Week
                    title = `📅 ${body.weekRange} 주간 스케줄`;
                    bodyText = '새로운 주간 스케줄이 등록되었습니다!';
                }

                await sendMulticastNotification(title, bodyText, '/icon-192x192.png');
                console.log('Push notification sent successfully');
            } catch (pError) {
                console.error('Failed to send push notification after save:', pError);
            }

            return NextResponse.json({ success: true });
        } else {
            console.error('Failed to save to Supabase');
            return NextResponse.json({ error: 'Failed to save to Supabase' }, { status: 500 });
        }
    } catch (error) {
        console.error('Admin save error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
