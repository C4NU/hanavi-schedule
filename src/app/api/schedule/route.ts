import { NextResponse } from 'next/server';
import { getScheduleFromSheet } from '@/utils/googleSheets';
import { MOCK_SCHEDULE } from '@/data/mockSchedule';

export async function GET() {
    // Fetch schedule from Google Sheets
    try {
        const schedule = await getScheduleFromSheet();

        if (schedule) {
            return NextResponse.json(schedule);
        }

        console.warn('Failed to fetch from Google Sheets, falling back to mock data');
        return NextResponse.json(MOCK_SCHEDULE);
    } catch (error) {
        console.error('Schedule fetch error:', error);
        return NextResponse.json(MOCK_SCHEDULE);
    }
}
