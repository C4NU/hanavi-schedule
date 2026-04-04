import { NextResponse } from 'next/server';
import { getScheduleFromSupabase } from '@/utils/supabase';
import { sendMulticastNotification } from '@/lib/notifications';
import { stripHtml } from '@/utils/text';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // 1. 보안 체크 (쿼리 파라미터 secret 또는 Authorization header 확인)
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');
        const adminSecret = process.env.ADMIN_SECRET;
        
        const authHeader = request.headers.get('authorization');
        const isCronAuthorized = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
        const isSecretAuthorized = adminSecret && secret === adminSecret;

        if (!isCronAuthorized && !isSecretAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. 현재 한국 시간(KST) 및 요일 계산
        const now = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(now.getTime() + kstOffset);
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const todayName = dayNames[kstDate.getUTCDay()]; // getUTCDay() since we added offset manually

        // 3. 최신 스케줄 데이터 가져오기
        const schedule = await getScheduleFromSupabase();
        if (!schedule) {
            return NextResponse.json({ error: 'No schedule found' }, { status: 404 });
        }

        // 4. 오늘의 방송 요약 데이터 추출
        const broadcasts: { time: string; name: string; content: string }[] = [];

        schedule.characters.forEach(char => {
            const todaySchedule = char.schedule[todayName];
            if (todaySchedule && todaySchedule.type === 'stream' && todaySchedule.content && todaySchedule.content !== '휴방') {
                broadcasts.push({
                    time: todaySchedule.time || '시간 미정',
                    name: char.name,
                    content: stripHtml(todaySchedule.content)
                });
            }
        });

        // 5. 시간순으로 정렬
        broadcasts.sort((a, b) => a.time.localeCompare(b.time));

        // 6. 알림 문구 생성
        if (broadcasts.length === 0) {
            return NextResponse.json({ message: 'No broadcasts for today. Skip notification.' });
        }

        const title = `📅 오늘의 방송 일정 (${todayName})`;
        let body = broadcasts
            .map(b => `- ${b.time} ${b.name}: ${b.content}`)
            .join('\n');

        if (body.length > 200) {
            body = body.substring(0, 197) + '...';
        }

        // 7. 알림 전송
        const result = await sendMulticastNotification(title, body, '/icon-192x192.png');

        return NextResponse.json({
            success: true,
            day: todayName,
            broadcastCount: broadcasts.length,
            fcmResult: result
        });

    } catch (error) {
        console.error('Daily summary notification error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
