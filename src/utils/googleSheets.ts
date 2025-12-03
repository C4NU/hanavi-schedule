import { google } from 'googleapis';
import { WeeklySchedule, CharacterSchedule, ScheduleItem } from '@/types/schedule';
import path from 'path';
import process from 'process';

// Environment variables
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

// Scopes
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

async function getAuth() {
    // 1. Try using environment variables (Vercel / Production)
    if (CLIENT_EMAIL && PRIVATE_KEY) {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: CLIENT_EMAIL,
                private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: SCOPES,
        });
        return await auth.getClient();
    }

    // 2. Try using secrets.json (Local Development)
    try {
        const keyFile = path.join(process.cwd(), 'secrets.json');
        const auth = new google.auth.GoogleAuth({
            keyFile: keyFile,
            scopes: SCOPES,
        });
        return await auth.getClient();
    } catch (error) {
        console.error('Failed to load credentials from secrets.json', error);
        return null;
    }
}

export async function getScheduleFromSheet(): Promise<WeeklySchedule | null> {
    if (!SHEET_ID) {
        console.error('GOOGLE_SHEET_ID is not defined');
        return null;
    }

    console.log('Fetching schedule from Google Sheet...');

    const auth = await getAuth();
    if (!auth) {
        console.error('Failed to authenticate with Google Sheets API');
        return null;
    }

    const sheets = google.sheets({ version: 'v4', auth: auth as any });

    try {
        // 1. Get the spreadsheet metadata to find the sheet name
        const metadata = await sheets.spreadsheets.get({
            spreadsheetId: SHEET_ID,
        });

        const sheetTitle = metadata.data.sheets?.[0]?.properties?.title;
        if (!sheetTitle) {
            console.error('No sheets found in the spreadsheet');
            return null;
        }

        // 2. Fetch data using the dynamic sheet title
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${sheetTitle}!A:Z`, // Read the entire first sheet
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.warn('No data found in the spreadsheet');
            return null;
        }

        return parseSheetData(rows);
    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error);
        return null;
    }
}

function parseSheetData(rows: string[][]): WeeklySchedule {
    let weekRange = '';
    const characters: CharacterSchedule[] = [];
    const scheduleMap: Record<string, any> = {}; // Temporary storage for schedule data

    let currentSection = '';
    let headerMap: Record<string, number> = {};

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0) continue;

        const firstCell = row[0].trim();

        // Detect Section Headers
        if (firstCell.startsWith('#')) {
            if (firstCell.includes('METADATA')) currentSection = 'METADATA';
            else if (firstCell.includes('CHARACTERS')) currentSection = 'CHARACTERS';
            else if (firstCell.includes('SCHEDULES')) currentSection = 'SCHEDULES';

            // Reset header map for new section (next row is usually header)
            headerMap = {};
            // Skip the section header row
            continue;
        }

        // Parse Header Row (if it looks like a header)
        if (currentSection === 'METADATA' && row[0] === 'Key') {
            // Metadata header, skip
            continue;
        }
        if (currentSection === 'CHARACTERS' && row[0] === 'ID') {
            row.forEach((col, index) => { headerMap[col.trim()] = index; });
            continue;
        }
        if (currentSection === 'SCHEDULES' && row[0] === 'ID') {
            row.forEach((col, index) => { headerMap[col.trim()] = index; });
            continue;
        }

        // Parse Data Rows based on section
        if (currentSection === 'METADATA') {
            if (row[0] === 'weekRange') {
                weekRange = row[1];
            }
        } else if (currentSection === 'CHARACTERS') {
            // Ensure we have a valid ID
            const idIndex = headerMap['ID'];
            if (idIndex === undefined || !row[idIndex]) continue;

            const id = row[idIndex];
            const name = row[headerMap['Name']] || '';
            const theme = (row[headerMap['Theme']] || 'varessa') as any;
            const avatarUrl = row[headerMap['Avatar URL']] || '';
            const chzzkUrl = row[headerMap['Chzzk URL']] || '';

            characters.push({
                id,
                name,
                colorTheme: theme,
                avatarUrl,
                chzzkUrl,
                schedule: {} // Will be filled later
            });
        } else if (currentSection === 'SCHEDULES') {
            const idIndex = headerMap['ID'];
            if (idIndex === undefined || !row[idIndex]) continue;

            const id = row[idIndex];
            scheduleMap[id] = row;
        }
    }

    // Merge Schedule Data into Characters
    const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    characters.forEach(char => {
        const scheduleRow = scheduleMap[char.id];
        if (scheduleRow) {
            DAYS.forEach(day => {
                const colIndex = headerMap[day];
                if (colIndex !== undefined && scheduleRow[colIndex]) {
                    char.schedule[day] = parseScheduleCell(scheduleRow[colIndex]);
                } else {
                    // Default to OFF if missing
                    char.schedule[day] = { time: '', content: '휴방', type: 'off' };
                }
            });
        }
    });

    return {
        weekRange: weekRange || '날짜 미정',
        characters
    };
}

function parseScheduleCell(cellValue: string): ScheduleItem {
    if (!cellValue || cellValue === 'OFF') {
        return { time: '', content: '휴방', type: 'off' };
    }

    const parts = cellValue.split('|').map(s => s.trim());
    const time = parts[0] || '';
    const content = parts[1] || '';
    let type: 'stream' | 'video' | 'collab' | 'off' = 'stream';

    if (parts[2]) {
        const typeStr = parts[2].toLowerCase();
        if (typeStr.includes('collab')) type = 'collab'; // Map all collab subtypes to 'collab' for now, or handle specifically if needed
        else if (typeStr === 'video') type = 'video';
        else if (typeStr === 'off') type = 'off';
    }

    // Preserve the specific collab type in content if needed, or just rely on the 'collab' type
    // The UI might need to distinguish between collab types if they have different styling.
    // For now, let's keep the content as is.

    return {
        time,
        content,
        type
    };
}
