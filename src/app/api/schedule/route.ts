import { NextResponse } from 'next/server';

export async function GET() {
    const googleDocUrl = process.env.GOOGLE_DOC_URL;

    if (!googleDocUrl) {
        return NextResponse.json(
            { error: 'Google Doc URL not configured' },
            { status: 404 }
        );
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
