export function timeToMinutes(timeStr: string): number | null {
    const match = /^(\d{1,2}):([0-5]\d)$/.exec(timeStr.trim());
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 29) return null;

    return hours * 60 + minutes;
}
