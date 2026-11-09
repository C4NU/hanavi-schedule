import { describe, expect, it } from 'vitest';
import { readJsonBody } from '@/lib/requestBody';

describe('bounded JSON request body', () => {
    it('parses a body within the byte limit', async () => {
        const request = new Request('http://localhost', { method: 'POST', body: '{"ok":true}' });
        expect(await readJsonBody(request, 20)).toEqual({ ok: true });
    });
    it('rejects an oversized body without relying on content-length', async () => {
        const request = new Request('http://localhost', { method: 'POST', body: '"123456"' });
        await expect(readJsonBody(request, 5)).rejects.toMatchObject({ status: 413 });
    });
    it('rejects malformed JSON', async () => {
        const request = new Request('http://localhost', { method: 'POST', body: '{' });
        await expect(readJsonBody(request, 20)).rejects.toMatchObject({ status: 400 });
    });
});
