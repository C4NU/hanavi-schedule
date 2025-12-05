import { db, messagingAdmin } from '@/lib/firebase-admin';

export interface NotificationResult {
    success: boolean;
    successCount: number;
    failureCount: number;
    message?: string;
    error?: any;
}

/**
 * 구독형 사용자 전체에게 멀티캐스트 알림을 전송합니다.
 * 토큰 조회, 청크 분할 전송, 유효하지 않은 토큰 정리까지 자동으로 처리합니다.
 */
export async function sendMulticastNotification(title: string, body: string, icon: string = '/icon-192x192.png'): Promise<NotificationResult> {
    try {
        // 1. 토큰 조회
        const tokensSnapshot = await db.collection('fcm_tokens').get();
        if (tokensSnapshot.empty) {
            return {
                success: true,
                successCount: 0,
                failureCount: 0,
                message: '구독자가 없습니다.'
            };
        }

        const tokens = tokensSnapshot.docs.map(doc => doc.id);

        // 2. 청크 분할 (FCM은 한번에 최대 500개까지만 전송 가능)
        const chunkSize = 500;
        const chunks = [];
        for (let i = 0; i < tokens.length; i += chunkSize) {
            chunks.push(tokens.slice(i, i + chunkSize));
        }

        let successCount = 0;
        let failureCount = 0;

        // 3. 알림 전송
        for (const chunk of chunks) {
            const message = {
                notification: {
                    title,
                    body,
                },
                webpush: {
                    headers: {
                        'Urgency': 'high',
                    },
                    notification: {
                        icon,
                    }
                },
                tokens: chunk
            };

            const response = await messagingAdmin.sendEachForMulticast(message);
            successCount += response.successCount;
            failureCount += response.failureCount;

            // 4. 유효하지 않은 토큰 정리
            if (response.failureCount > 0) {
                const failedTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const error = resp.error;
                        if (error?.code === 'messaging/registration-token-not-registered') {
                            failedTokens.push(chunk[idx]);
                        }
                    }
                });

                if (failedTokens.length > 0) {
                    const batch = db.batch();
                    failedTokens.forEach(t => {
                        batch.delete(db.collection('fcm_tokens').doc(t));
                    });
                    await batch.commit();
                }
            }
        }

        return {
            success: true,
            successCount,
            failureCount,
            message: `성공: ${successCount}건, 실패: ${failureCount}건`
        };

    } catch (error) {
        console.error('푸시 전송 중 에러:', error);
        return {
            success: false,
            successCount: 0,
            failureCount: 0,
            error
        };
    }
}
