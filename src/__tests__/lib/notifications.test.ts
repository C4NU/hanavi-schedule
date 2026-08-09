import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  batchDelete: vi.fn(),
  batchCommit: vi.fn(),
  deliveryCreate: vi.fn(),
  deliveryDelete: vi.fn(),
  deliverySet: vi.fn(),
  getTokens: vi.fn(),
  sendEachForMulticast: vi.fn(),
}));

vi.mock('@/lib/firebase-admin', () => ({
  db: {
    batch: () => ({
      delete: mocks.batchDelete,
      commit: mocks.batchCommit,
    }),
    collection: vi.fn((name: string) => {
      if (name === 'fcm_tokens') {
        return {
          get: mocks.getTokens,
          doc: vi.fn((id: string) => ({ id })),
        };
      }

      return {
        doc: vi.fn(() => ({
          create: mocks.deliveryCreate,
          delete: mocks.deliveryDelete,
          set: mocks.deliverySet,
        })),
      };
    }),
  },
  messagingAdmin: {
    sendEachForMulticast: mocks.sendEachForMulticast,
  },
}));

import {
  sendMulticastNotification,
  sendMulticastNotificationOnce,
} from '@/lib/notifications';

describe('notification delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.batchCommit.mockResolvedValue(undefined);
    mocks.deliveryCreate.mockResolvedValue(undefined);
    mocks.deliveryDelete.mockResolvedValue(undefined);
    mocks.deliverySet.mockResolvedValue(undefined);
  });

  it('sends the stored token values once instead of Firestore document IDs', async () => {
    const invalidTokenRef = { id: 'hash-b' };
    mocks.getTokens.mockResolvedValue({
      empty: false,
      docs: [
        { id: 'hash-a', ref: { id: 'hash-a' }, data: () => ({ token: 'real-token-a' }) },
        { id: 'hash-a-duplicate', ref: { id: 'hash-a-duplicate' }, data: () => ({ token: 'real-token-a' }) },
        { id: 'hash-b', ref: invalidTokenRef, data: () => ({ token: 'real-token-b' }) },
        { id: 'missing-token', ref: { id: 'missing-token' }, data: () => ({}) },
      ],
    });
    mocks.sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
    });

    await sendMulticastNotification('제목', '내용');

    expect(mocks.sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(mocks.sendEachForMulticast.mock.calls[0][0].tokens).toEqual([
      'real-token-a',
      'real-token-b',
    ]);
    expect(mocks.batchDelete).toHaveBeenCalledWith(invalidTokenRef);
  });

  it('does not send the same notification after its delivery key is claimed', async () => {
    mocks.deliveryCreate.mockRejectedValueOnce({ code: 6 });

    const result = await sendMulticastNotificationOnce(
      'daily-summary-2026-08-10',
      '제목',
      '내용',
    );

    expect(result.duplicate).toBe(true);
    expect(mocks.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('skips delivery when no stored document contains a valid token', async () => {
    mocks.getTokens.mockResolvedValue({
      empty: false,
      docs: [
        { id: 'missing-token', ref: { id: 'missing-token' }, data: () => ({}) },
      ],
    });

    const result = await sendMulticastNotification('제목', '내용');

    expect(result.success).toBe(true);
    expect(result.successCount).toBe(0);
    expect(mocks.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('releases the delivery claim when sending fails so it can be retried', async () => {
    mocks.getTokens.mockRejectedValueOnce(new Error('Firestore unavailable'));

    const result = await sendMulticastNotificationOnce(
      'daily-summary-2026-08-10',
      '제목',
      '내용',
    );

    expect(result.success).toBe(false);
    expect(mocks.deliveryDelete).toHaveBeenCalledTimes(1);
    expect(mocks.deliverySet).not.toHaveBeenCalled();
  });

  it('marks a claimed delivery as sent after a successful multicast', async () => {
    mocks.getTokens.mockResolvedValue({
      empty: false,
      docs: [
        { id: 'hash-a', ref: { id: 'hash-a' }, data: () => ({ token: 'real-token-a' }) },
      ],
    });
    mocks.sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });

    const result = await sendMulticastNotificationOnce(
      'daily-summary-2026-08-10',
      '제목',
      '내용',
    );

    expect(result.success).toBe(true);
    expect(mocks.deliverySet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent' }),
      { merge: true },
    );
  });
});
