import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('characters RLS', () => {
    it('removes the legacy anonymous full-access policy', () => {
        const migrationPath = path.resolve(
            process.cwd(),
            'supabase/migrations/20260809_remove_public_characters_write.sql',
        );
        const migration = readFileSync(migrationPath, 'utf8');

        expect(migration).toContain(
            'DROP POLICY IF EXISTS "Allow public full access to characters" ON public.characters;',
        );
        expect(migration).toContain(
            'DROP POLICY IF EXISTS "Enable update for admins and owners" ON public.characters;',
        );
        expect(migration).toContain('CREATE POLICY "Admin Write Characters" ON public.characters');
        const schema = readFileSync(path.resolve(process.cwd(), 'supabase/schema.sql'), 'utf8');
        expect(schema).not.toContain('Allow public full access to characters');
    });
});
