import React from 'react';
import { ImageResponse } from 'next/og';
import type { CharacterSchedule, ScheduleItem, WeeklySchedule } from '@/types/schedule';
import { splitScheduleItem, timeToMinutes } from '@/utils/time';
import { stripHtml } from '@/utils/text';
import { getV2BroadcastGradient, getV2ContentColor, V2_CELL_COLOR_OVERRIDES, V2_COLLAB_ACCENT } from '@/data/v2ContentColors';
import { formatWeekRangeShort } from '@/utils/date';
import { PNG_HEADING } from '@/lib/schedulePngHeading';

export type SchedulePngView = 'member' | 'weekly';
export type SchedulePngTheme = 'v2' | 'classic';
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const WIDTH = 1440;
const SIDE = 36;
const MEMBER_WIDTH = 126;
const HEADER = 144;
const DAY_HEADER = 36;
const GAP = 6;
const FOOTER_SPACE = 28;
const DAY_WIDTH = (WIDTH - SIDE * 2 - MEMBER_WIDTH) / DAYS.length;
const WEEKLY_PROFILES = 216;
const WEEKLY_DAY_WIDTH = (WIDTH - SIDE * 2 - 64 - WEEKLY_PROFILES) / DAYS.length;
const START = 8 * 60;
const END = 30 * 60;

type ExtraPngFonts = { numerals: Buffer; heading: Buffer; serif: Buffer };
const NUMERALS = 'Hanavi PNG Numerals';
const HEADING = 'Hanavi PNG Heading';
const SERIF = 'Hanavi PNG Serif';
const CONTENT = 'Hanavi Export';

type Block = { item: ScheduleItem; char: CharacterSchedule; x: number; y: number; width: number; height: number; name?: string };
type Profile = { char: CharacterSchedule; x: number; y: number; width: number; height: number };
type Scene = { width: number; height: number; blocks: Block[]; profiles: Profile[] };

function isCollab(item: ScheduleItem) {
    return item.type?.startsWith('collab') === true;
}

function eventKey(item: ScheduleItem) {
    return isCollab(item) && item.eventId ? `${item.eventId}|${item.time}` : undefined;
}

export function buildMemberPngScene(characters: CharacterSchedule[]): Scene {
    const blocks: Block[] = [];
    const profiles: Profile[] = [];
    const lastShared = new Map<number, Block>();
    let y = HEADER + DAY_HEADER;
    for (const char of characters) {
        const days = DAYS.map(day => splitScheduleItem(char.schedule[day]));
        const lines = Math.max(1, ...days.map(items => items.length > 3 ? Math.ceil(items.length / 2) : 1));
        const height = Math.max(96, lines * 68) + GAP;
        profiles.push({ char, x: SIDE, y, width: MEMBER_WIDTH - GAP, height: height - GAP });
        days.forEach((parts, day) => {
            const items = parts.length ? parts : [{ time: '', content: '', type: 'off' as const }];
            const prior = lastShared.get(day);
            const key = items.length === 1 ? eventKey(items[0]) : undefined;
            if (prior && key && eventKey(prior.item) === key && prior.y + prior.height + GAP === y) {
                prior.height += height;
                return;
            }
            lastShared.delete(day);
            const columns = items.length > 3 ? 2 : items.length;
            const itemWidth = (DAY_WIDTH - GAP) / columns;
            const itemHeight = (height - GAP) / Math.ceil(items.length / columns);
            items.forEach((item, index) => {
                const block: Block = {
                    item, char, x: SIDE + MEMBER_WIDTH + day * DAY_WIDTH + (index % columns) * itemWidth,
                    y: y + Math.floor(index / columns) * itemHeight, width: itemWidth - 3, height: itemHeight - 3,
                };
                blocks.push(block);
                if (key) {
                    block.height += 3;
                    lastShared.set(day, block);
                }
            });
        });
        y += height;
    }
    return { width: WIDTH, height: y + SIDE + FOOTER_SPACE, blocks, profiles };
}

export function buildWeeklyPngScene(characters: CharacterSchedule[]): Scene {
    const unit = 35 / 60;
    const blocks = DAYS.flatMap((day, index) => {
        const entries: { item: ScheduleItem; char: CharacterSchedule; start: number; end: number; names: string[] }[] = [];
        const shared = new Map<string, typeof entries[number]>();
        for (const char of characters) {
            for (const item of splitScheduleItem(char.schedule[day])) {
                if (item.type === 'off' || (!item.content && !item.time)) continue;
                const start = Math.max(START, timeToMinutes(item.time) ?? timeToMinutes(char.defaultTime ?? '') ?? 18 * 60);
                const key = eventKey(item);
                const match = key && shared.get(key);
                if (match) {
                    if (!match.names.includes(char.name)) match.names.push(char.name);
                    continue;
                }
                const entry = { item, char, start, end: Math.min(start + 120, END), names: [char.name] };
                if (key) shared.set(key, entry);
                entries.push(entry);
            }
        }
        entries.sort((first, second) => first.start - second.start);
        const groups: (typeof entries)[] = [];
        let end = -1;
        for (const entry of entries) {
            if (entry.start >= end) {
                groups.push([]);
                end = entry.end;
            } else {
                end = Math.max(end, entry.end);
            }
            groups.at(-1)?.push(entry);
        }
        return groups.flatMap(group => group.map(({ item, char, start, end, names }, column): Block => {
            const width = (WEEKLY_DAY_WIDTH - GAP) / group.length;
            return {
                item, char, name: names.join(' · '), x: SIDE + 64 + index * WEEKLY_DAY_WIDTH + column * width,
                y: HEADER + DAY_HEADER + (start - START) * unit, width: width - 3, height: Math.max(18, (end - start) * unit - 3),
            };
        }));
    });
    const profiles = characters.map((char, index) => ({
        char, x: WIDTH - SIDE - WEEKLY_PROFILES + 10, y: HEADER + DAY_HEADER + index * 106,
        width: WEEKLY_PROFILES - 10, height: 100,
    }));
    return {
        width: WIDTH,
        height: HEADER + DAY_HEADER + Math.max((END - START) * unit, characters.length * 106) + SIDE + FOOTER_SPACE,
        blocks, profiles,
    };
}

function color(value: string | undefined, fallback: string) {
    return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export function pngTitle(html: string, width: number, height: number, size: number) {
    const input = stripHtml(html.replace(/<br\s*\/?\s*>|<\/(?:p|div)>/gi, '\n')).trim();
    const maxUnits = Math.max(2, Math.floor((width - 16) / size));
    const maxLines = Math.max(1, Math.floor((height - 31) / (size * 1.25)));
    const lines: string[] = [''];
    let units = 0;
    for (const glyph of Array.from(input)) {
        const next = /[\u0000-\u007f]/.test(glyph) ? 0.58 : 1;
        if (glyph === '\n' || units + next > maxUnits) {
            if (lines.length >= maxLines) {
                lines[maxLines - 1] = Array.from(lines[maxLines - 1]).slice(0, -1).join('') + '…';
                break;
            }
            lines.push('');
            units = 0;
            if (glyph === '\n') continue;
        }
        lines[lines.length - 1] += glyph;
        units += next;
    }
    return lines;
}

function PngBlock({ block, classic }: { block: Block; classic: boolean }) {
    const { char, item, x, y, width, height, name } = block;
    const off = item.type === 'off';
    const collab = isCollab(item);
    const bg = off ? '#e8e8ea' : collab ? '#ffe5ef' : color(char.colorBg, '#fff1f6');
    const accent = color(char.colorBorder, '#f386ab');
    const timeColor = classic ? accent : collab ? V2_COLLAB_ACCENT.color : V2_CELL_COLOR_OVERRIDES[char.id]?.time ?? accent;
    const textColor = classic ? '#3d3040' : collab ? V2_COLLAB_ACCENT.color : getV2ContentColor(char.id, accent);
    const size = width < 72 ? 11 : width < 110 || name ? 14 : 17;
    const timeSize = width < 72 ? 12 : width < 110 || name ? 17 : 23;
    const inset = width > 110 ? 11 : width > 65 ? 7 : 4;
    const timeHeight = Math.ceil(timeSize * 1.15);
    const titleRow = inset + timeHeight + (name ? 14 : 3);
    const nameSize = Math.min(size, 13);
    const nameLine = name ? pngTitle(name, width, 45, nameSize)[0] : '';
    const lines = pngTitle(item.content, width - (classic ? 0 : 9), height - (name ? 13 : 0), size);
    const memoCount = item.memos?.length ?? 0;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: off ? 'center' : 'flex-start',
            alignItems: off ? 'center' : 'flex-start', position: 'absolute', left: x, top: y, width, height,
            ...(classic || off ? { backgroundColor: bg } : { backgroundImage: getV2BroadcastGradient(char.id, char.colorBg, collab) }),
            borderRadius: classic ? 8 : 14, overflow: 'hidden',
            ...(classic ? {} : { boxShadow: '0 3px 7px rgba(101,57,73,0.14)' }),
            color: textColor }}>
            {off ? <span style={{ fontSize: width < 80 ? 10 : 14, fontFamily: NUMERALS, letterSpacing: 1, color: classic ? accent : '#9b9ba1' }}>OFFLINE</span> : <>
                <div style={{ display: 'flex', position: 'absolute', left: inset, top: inset,
                    fontFamily: item.time ? NUMERALS : CONTENT, fontSize: timeSize, color: timeColor, lineHeight: 1 }}>{item.time || '시간 미정'}</div>
                {!classic && memoCount > 0 && width > 88 && <div style={{ display: 'flex', position: 'absolute', right: 4,
                    top: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', color: textColor,
                    fontFamily: NUMERALS, fontSize: 10, justifyContent: 'center', alignItems: 'center' }}>{Math.min(memoCount, 99)}</div>}
                {nameLine && <div style={{ display: 'flex', position: 'absolute', left: inset,
                    top: inset + timeHeight, fontSize: nameSize, lineHeight: 1, whiteSpace: 'nowrap' }}>{nameLine}</div>}
                {!classic && !name && lines.some(Boolean) && <div style={{ display: 'flex', position: 'absolute', left: inset,
                    top: titleRow + 3, width: 6, height: 6 }}>
                    <svg width="6" height="6" viewBox="0 0 6 6">
                        <path d="M0 0L6 3L0 6Z" fill={textColor} />
                    </svg>
                </div>}
                {lines.filter(Boolean).map((line, index) => <div key={index} style={{ display: 'flex', position: 'absolute',
                    left: inset + (!classic && !name ? 9 : 0), top: titleRow + index * Math.ceil(size * 1.2),
                    fontSize: size, lineHeight: 1, whiteSpace: 'nowrap' }}>{line}</div>)}
            </>}
        </div>
    );
}

function PngMember({ profile, avatar, classic }: { profile: Profile; avatar?: string; classic: boolean }) {
    const { char, x, y, width, height } = profile;
    const square = Math.min(width, height);
    const accent = color(char.colorBorder, '#f386ab');
    return (
        <div style={{ display: 'flex', position: 'absolute', left: x, top: y, width, height,
            alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            backgroundColor: classic ? color(char.colorBg, '#f5e4ed') : 'transparent', borderRadius: 10 }}>
            <div style={{ display: 'flex', width: classic ? 68 : square, height: classic ? 68 : square,
                borderRadius: classic ? 12 : Math.round(square * .22), overflow: 'hidden', backgroundColor: color(char.colorBg, '#f5e4ed'),
                alignItems: 'center', justifyContent: 'center',
                ...(classic ? {} : { boxShadow: '0 3px 8px rgba(255,143,171,0.22)' }) }}>
                {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" width={classic ? 68 : square} height={classic ? 68 : square} style={{ objectFit: 'cover' }} />
                ) : <span style={{ color: accent, fontSize: 25 }}>{char.name.slice(0, 1)}</span>}
            </div>
            <span style={classic ? { fontSize: 16 } : {
                display: 'flex', position: 'absolute', top: -4, left: Math.max(0, (width - square) / 2 - 6),
                padding: '3px 8px', alignItems: 'center', borderRadius: 999, backgroundColor: accent,
                color: '#fff', fontFamily: SERIF, fontSize: 12, lineHeight: 1.2, boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
            }}>{char.name}</span>
        </div>
    );
}

export function renderSchedulePng(data: WeeklySchedule, options: {
    view: SchedulePngView; theme: SchedulePngTheme; font: Buffer; extraFonts: ExtraPngFonts; avatarById: Map<string, string>;
}) {
    const scene = options.view === 'member' ? buildMemberPngScene(data.characters) : buildWeeklyPngScene(data.characters);
    if (scene.height > 4096 || scene.blocks.some(block => block.width < 8)) throw new Error('Schedule exceeds PNG bounds');
    const classic = options.theme === 'classic';
    const memberView = options.view === 'member';
    const date = classic ? data.weekRange : formatWeekRangeShort(data.weekRange);
    const headingTop = PNG_HEADING.top[options.theme];
    const startX = SIDE + (options.view === 'member' ? MEMBER_WIDTH : 64);
    const dayWidth = options.view === 'member' ? DAY_WIDTH : WEEKLY_DAY_WIDTH;
    return new ImageResponse(
        <div style={{ display: 'flex', position: 'relative', flexDirection: 'column', width: '100%', height: '100%',
            backgroundColor: PNG_HEADING.background[options.theme], color: '#63364d', fontFamily: CONTENT }}>
            <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: SIDE, top: 28, alignItems: 'flex-start' }}>
                {!classic && <span style={{ display: 'flex', fontFamily: SERIF, fontSize: 12, letterSpacing: 2, color: '#fff',
                    padding: '5px 13px', borderRadius: 999, backgroundImage: 'linear-gradient(135deg,#f9a8c0,#f472a6)',
                    boxShadow: '0 2px 8px rgba(244,114,166,0.27)' }}>WEEKLY SCHEDULE</span>}
            </div>
            {!classic && <div style={{ display: 'flex', position: 'absolute', left: SIDE, top: headingTop + 18 }}>
                <svg width="12" height="12" viewBox="0 0 12 12">
                    <path d="M0 0L12 6L0 12Z" fill="#f472a6" />
                </svg>
            </div>}
            <div style={{ display: 'flex', position: 'absolute', left: PNG_HEADING.left[options.theme], top: headingTop,
                height: PNG_HEADING.height, alignItems: 'center', color: PNG_HEADING.color,
                fontFamily: HEADING, fontSize: PNG_HEADING.fontSize }}>{PNG_HEADING.titles[options.theme]}</div>
            <div style={{ display: 'flex', position: 'absolute', right: SIDE, top: headingTop,
                height: PNG_HEADING.height, minWidth: 198, justifyContent: 'center', alignItems: 'center', padding: '0 22px',
                border: '1px solid #f8d1dc', borderRadius: 999, backgroundColor: '#fff', color: '#b6557b',
                boxShadow: '0 2px 6px rgba(101,57,73,0.13)', fontFamily: NUMERALS, fontSize: 21 }}>{date}</div>
            {!classic && memberView && <div style={{ display: 'flex', position: 'absolute', left: SIDE - 12, right: SIDE - 12,
                top: HEADER - 12, bottom: SIDE - 14 + FOOTER_SPACE, borderRadius: 21,
                backgroundImage: 'linear-gradient(135deg,#fff 0%,#ffedf1 44%,#ffd6df 100%)' }} />}
            {!classic && memberView && <div style={{ display: 'flex', position: 'absolute', left: SIDE + MEMBER_WIDTH / 2 - 7,
                top: HEADER + 2, width: 14, height: 14 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v12M2.8 5l10.4 6M2.8 11l10.4-6" stroke="#f386ab" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            </div>}
            {DAYS.map((day, index) => (
                <div key={day} style={{ display: 'flex', position: 'absolute', left: startX + index * dayWidth,
                    top: HEADER, width: dayWidth - GAP, height: DAY_HEADER, justifyContent: 'center',
                    fontFamily: NUMERALS, letterSpacing: 2, color: classic ? '#63364d' : '#ce698e', fontSize: 13 }}>{day}</div>
            ))}
            {options.view === 'weekly' && Array.from({ length: 12 }, (_, index) => (
                <div key={index} style={{ display: 'flex', position: 'absolute', left: SIDE, top: HEADER + DAY_HEADER + index * 70,
                    width: WIDTH - SIDE * 2 - WEEKLY_PROFILES, height: 1, backgroundColor: '#f3dbe8',
                    fontFamily: NUMERALS, fontSize: 13, color: '#805869' }}>
                    {`${8 + index * 2}:00`}
                </div>
            ))}
            {scene.profiles.map(profile => <PngMember key={profile.char.id} profile={profile}
                avatar={options.avatarById.get(profile.char.id)} classic={classic} />)}
            {scene.blocks.map((block, index) => <PngBlock block={block} classic={classic} key={index} />)}
            <div style={{ display: 'flex', position: 'absolute', bottom: 16, left: SIDE, right: SIDE, height: 16,
                alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, letterSpacing: 1.6, fontSize: 10, color: '#bd647e' }}>
                A WORLD WHERE DREAMING GIRLS ENCOUNTER THE MELODY OF HOPE. VIRTUAL GAKUIN UNIVERSE PRODUCED BY UPLIFT CORPORATION
            </div>
        </div>,
        { width: scene.width, height: scene.height, fonts: [
            { name: CONTENT, data: options.font },
            { name: NUMERALS, data: options.extraFonts.numerals },
            { name: HEADING, data: options.extraFonts.heading },
            { name: SERIF, data: options.extraFonts.serif },
        ] },
    );
}
