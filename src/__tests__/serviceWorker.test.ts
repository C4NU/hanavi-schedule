import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const firebase = vi.hoisted(() => ({
    getMessaging: vi.fn(),
    onBackgroundMessage: vi.fn(),
}));
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/messaging/sw', () => firebase);

const showNotification = vi.fn();
const addEventListener = vi.fn();
const matchAll = vi.fn();
const openWindow = vi.fn();

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    for (const key of ['API_KEY', 'PROJECT_ID', 'MESSAGING_SENDER_ID', 'APP_ID']) {
        vi.stubEnv(`NEXT_PUBLIC_FIREBASE_${key}`, 'test');
    }
    vi.stubGlobal('self', {
        location: { origin: 'https://schedule.example' },
        registration: { showNotification },
        addEventListener,
        clients: { matchAll, openWindow },
    });
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

it('leaves Firebase notification payloads to the SDK and displays data-only messages once', async () => {
    await import('../../worker');
    const onMessage = firebase.onBackgroundMessage.mock.calls[0][1];

    await onMessage({ notification: { title: 'Firebase handles this' } });
    expect(showNotification).not.toHaveBeenCalled();

    await onMessage({ data: { title: '일정 변경', url: 'https://outside.example/' } });
    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith('일정 변경', expect.objectContaining({
        data: { hanaviUrl: 'https://schedule.example/' },
    }));
});

it('focuses a matching page for a custom notification without taking over Firebase clicks', async () => {
    await import('../../worker');
    const click = addEventListener.mock.calls.find(([name]) => name === 'notificationclick')![1];
    const close = vi.fn();
    const waitUntil = vi.fn();

    click({ notification: { data: {}, close }, waitUntil });
    expect(close).not.toHaveBeenCalled();

    const focus = vi.fn();
    matchAll.mockResolvedValue([{ url: 'https://schedule.example/', focus }]);
    click({ notification: { data: { hanaviUrl: '/' }, close }, waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(close).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
    expect(openWindow).not.toHaveBeenCalled();
});

it('skips Firebase initialization when public configuration is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', '');
    await import('../../worker');

    expect(firebase.getMessaging).not.toHaveBeenCalled();
});
