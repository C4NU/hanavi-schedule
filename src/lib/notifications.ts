import { db, messagingAdmin } from '@/lib/firebase-admin';

export interface NotificationResult {
    success: boolean;
    successCount: number;
    failureCount: number;
    duplicate?: boolean;
    message?: string;
    error?: unknown;
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

        const tokenRecords = Array.from(
            tokensSnapshot.docs.reduce((records, doc) => {
                const token = doc.data().token;
                if (typeof token === 'string' && token.length > 0 && !records.has(token)) {
                    records.set(token, { token, ref: doc.ref });
                }
                return records;
            }, new Map<string, { token: string; ref: FirebaseFirestore.DocumentReference }>()),
        ).map(([, record]) => record);

        if (tokenRecords.length === 0) {
            return {
                success: true,
                successCount: 0,
                failureCount: 0,
                message: '유효한 구독자가 없습니다.'
            };
        }

        // 2. 청크 분할 (FCM은 한번에 최대 500개까지만 전송 가능)
        const chunkSize = 500;
        const chunks = [];
        for (let i = 0; i < tokenRecords.length; i += chunkSize) {
            chunks.push(tokenRecords.slice(i, i + chunkSize));
        }

        let successCount = 0;
        let failureCount = 0;

        // 3. 알림 전송
        for (const chunk of chunks) {
            // Revert to notification payload for reliable delivery
            const message = {
                notification: {
                    title,
                    body,
                },
                data: {
                    url: '/'
                },
                webpush: {
                    headers: {
                        'Urgency': 'high',
                    },
                    notification: {
                        icon,
                        click_action: '/'
                    }
                },
                tokens: chunk.map(record => record.token)
            };

            const response = await messagingAdmin.sendEachForMulticast(message);
            successCount += response.successCount;
            failureCount += response.failureCount;

            // 4. 유효하지 않은 토큰 정리
            if (response.failureCount > 0) {
                const failedTokenRefs: FirebaseFirestore.DocumentReference[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const error = resp.error;
                        if (error?.code === 'messaging/registration-token-not-registered') {
                            failedTokenRefs.push(chunk[idx].ref);
                        }
                    }
                });

                if (failedTokenRefs.length > 0) {
                    const batch = db.batch();
                    failedTokenRefs.forEach(ref => {
                        batch.delete(ref);
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

function isAlreadyClaimed(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('code' in error)) return false;
    const code = (error as { code?: unknown }).code;
    return code === 6 || code === 'already-exists';
}

export async function sendMulticastNotificationOnce(
    deliveryKey: string,
    title: string,
    body: string,
    icon: string = '/icon-192x192.png',
): Promise<NotificationResult> {
    const deliveryRef = db.collection('notification_deliveries').doc(deliveryKey);

    try {
        await deliveryRef.create({
            status: 'sending',
            createdAt: new Date().toISOString(),
        });
    } catch (error) {
        if (isAlreadyClaimed(error)) {
            return {
                success: true,
                successCount: 0,
                failureCount: 0,
                duplicate: true,
                message: '이미 처리된 알림입니다.',
            };
        }

        return {
            success: false,
            successCount: 0,
            failureCount: 0,
            error,
        };
    }

    const result = await sendMulticastNotification(title, body, icon);
    if (!result.success) {
        await deliveryRef.delete().catch(() => undefined);
        return result;
    }

    await deliveryRef.set({
        status: 'sent',
        sentAt: new Date().toISOString(),
    }, { merge: true }).catch(error => {
        console.error('알림 발송 기록 저장 중 에러:', error);
    });

    return result;
}
