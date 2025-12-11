import { NextResponse } from 'next/server';

// Configuration for users
// In a real app, these should be in a DB or individual env vars
const ADMIN_SECRET = process.env.ADMIN_SECRET || '0000';

const MEMBERS = [
    { id: 'varessa', password: process.env.MEMBER_SECRET_VARESSA || 'varessa123' },
    { id: 'nemu', password: process.env.MEMBER_SECRET_NEMU || 'nemu123' },
    { id: 'maroka', password: process.env.MEMBER_SECRET_MAROKA || 'maroka123' },
    { id: 'mirai', password: process.env.MEMBER_SECRET_MIRAI || 'mirai123' },
    { id: 'ruvi', password: process.env.MEMBER_SECRET_RUVI || 'ruvi123' },
    { id: 'iriya', password: process.env.MEMBER_SECRET_IRIYA || 'iriya123' },
];

export async function POST(request: Request) {
    try {
        const { id, password } = await request.json();
        console.log(`[Login Debug] Attempting login with ID: '${id}', PW: '${password}'`);
        console.log(`[Login Debug] Expected Admin Secret: '${ADMIN_SECRET}'`);

        if (id === 'admin') {
            if (password === ADMIN_SECRET) {
                return NextResponse.json({ success: true, role: 'admin' });
            }
        } else {
            const member = MEMBERS.find(m => m.id === id);
            if (member && member.password === password) {
                return NextResponse.json({ success: true, role: member.id });
            }
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
