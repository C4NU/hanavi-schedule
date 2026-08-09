import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function read(relativePath: string) {
    return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('administrator client security contracts', () => {
    it('does not expose a cron secret through the public browser bundle', () => {
        const adminPage = read('src/app/admin/page.tsx');

        expect(adminPage).not.toContain('NEXT_PUBLIC_CRON_SECRET');
        expect(adminPage).not.toContain("'dev-secret'");
    });

    it('keeps push delivery in the cancelable client flow only', () => {
        const saveRoute = read('src/app/api/admin/schedule/route.ts');

        expect(saveRoute).not.toContain('sendMulticastNotification');
    });

    it('does not ask users to send an administrator secret in a request body', () => {
        const pushPage = read('src/app/admin/push/page.tsx');

        expect(pushPage).not.toContain('Admin Secret');
        expect(pushPage).not.toContain('secret,');
    });
});
