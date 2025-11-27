import { NextResponse } from 'next/server';
import { RAW_SCHEDULE_TEXT } from '@/data/rawSchedule';
import { parseSchedule } from '@/utils/parser';

export async function GET() {
    const googleDocUrl = process.env.GOOGLE_DOC_URL;

    if (!googleDocUrl) {
        // Return local data if no URL is configured
        // This prevents 404 errors in the console during development
        const schedule = parseSchedule(RAW_SCHEDULE_TEXT);
        return NextResponse.json(schedule);
    }

    try {
        // Placeholder for fetching logic
        // const response = await fetch(googleDocUrl);
        // const text = await response.text();
        // const schedule = parseSchedule(text);

        // For now, just return error to trigger fallback
        return NextResponse.json(
            { error: 'Fetching logic not implemented yet' },
            { status: 501 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch schedule' },
            { status: 500 }
        );
    }
}
