import { createHash, createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { db, messagingAdmin } from '@/lib/firebase-admin';

export const MOBILE_PUSH_COLLECTION = 'mobile_fcm_tokens';
const TOKEN_LIFETIME_MS = 60 * 24 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export function mobilePushEnabled() {
    return process.env.MOBILE_PUSH_ENABLED === 'true';
}

export function installationKey(request: Request) {
    return request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/i)?.[1];
}

export function parseMobilePushToken(raw: unknown) {
    if (!raw || typeof raw !== 'object' || !('token' in raw) || !('platform' in raw)) return null;
    const { token, platform } = raw;
    if (typeof token !== 'string' || !/^[a-zA-Z0-9_:%-]{100,500}$/.test(token)) return null;
    if (platform !== 'ios' && platform !== 'android') return null;
    return { token, platform };
}

export async function reserveMobilePushRegistration(request: Request) {
    // Vercel overwrites this header. Local runs share a single bucket.
    const remote = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : 'local';
    const secret = process.env.FIREBASE_PRIVATE_KEY;
    if (process.env.VERCEL && (!remote || !isIP(remote) || !secret)) throw new Error('Registration limiter unavailable');
    const requester = secret ? createHmac('sha256', secret).update('mobile-push-v1:').update(remote || 'local').digest('hex') : 'local';
    const ref = db.collection('mobile_push_registration_limits').doc(requester);
    return db.runTransaction(async transaction => {
        const limit = (await transaction.get(ref)).data();
        const now = Date.now();
        const startedAt = limit?.startedAt ?? now;
        const activeWindow = now - startedAt < RATE_WINDOW_MS;
        const count = activeWindow ? limit?.count ?? 0 : 0;
        if (count >= 30) return false;
        transaction.set(ref, { count: count + 1, startedAt: activeWindow ? startedAt : now });
        return true;
    });
}

export function isUnregisteredMobilePushToken(error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
    return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
}

function installationRef(key: string) {
    return db.collection(MOBILE_PUSH_COLLECTION).doc(hash(key));
}

export async function saveMobilePushToken(key: string, input: NonNullable<ReturnType<typeof parseMobilePushToken>>) {
    try {
        await messagingAdmin.send({ token: input.token, data: { url: '/' } }, true);
    } catch (error) {
        if (isUnregisteredMobilePushToken(error) || (error && typeof error === 'object' && 'code' in error && error.code === 'messaging/mismatched-credential')) return false;
        throw error;
    }
    await installationRef(key).set({ ...input, expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS) });
    return true;
}

export async function removeMobilePushToken(key: string) {
    await installationRef(key).delete();
}

export async function activeMobilePushTokens() {
    const snapshot = await db.collection(MOBILE_PUSH_COLLECTION).where('expiresAt', '>', new Date()).get();
    return snapshot.docs;
}

export async function removeExpiredMobilePushToken(ref: FirebaseFirestore.DocumentReference, token: string) {
    await db.runTransaction(async transaction => {
        const latest = (await transaction.get(ref)).data();
        if (latest?.token === token) transaction.delete(ref);
    });
}
