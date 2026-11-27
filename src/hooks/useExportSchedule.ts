import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { SchedulePngTheme, SchedulePngView } from '@/lib/schedulePng';
import { PNG_HEADING } from '@/lib/schedulePngHeading';

async function addWebFontHeading(png: Blob, theme: SchedulePngTheme): Promise<Blob> {
    if (!document.fonts || !window.createImageBitmap) return png;

    const { family, fontSize, weight, titles, color, height, width } = PNG_HEADING;
    const font = `${weight} ${fontSize}px "${family}"`;
    const title = titles[theme];
    const left = PNG_HEADING.left[theme];
    const top = PNG_HEADING.top[theme];
    let fontTimeout: number | undefined;
    try {
        const faces = await Promise.race([
            document.fonts.load(font, title),
            new Promise<FontFace[]>(resolve => {
                fontTimeout = window.setTimeout(() => resolve([]), 1500);
            }),
        ]);
        if (!faces.some(face => face.family.replaceAll('"', '').toLowerCase() === family && face.status === 'loaded')) return png;
        const source = await window.createImageBitmap(png);
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const context = canvas.getContext('2d');
        if (!context) {
            source.close();
            return png;
        }
        context.drawImage(source, 0, 0);
        source.close();
        context.fillStyle = PNG_HEADING.background[theme];
        context.fillRect(left, top, width, height);
        context.font = font;
        context.textBaseline = 'middle';
        context.fillStyle = color;
        context.fillText(title, left, top + height / 2);
        return await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob ?? png), 'image/png'));
    } catch {
        return png;
    } finally {
        window.clearTimeout(fontTimeout);
    }
}

export function useExportSchedule(trigger?: () => void) {
    const [isExporting, setIsExporting] = useState(false);
    const inFlight = useRef(false);

    const exportImage = async (week: string, view: SchedulePngView, theme: SchedulePngTheme, memberIds: Set<string>) => {
        if (inFlight.current) return;
        if (!memberIds.size) {
            toast.error('저장할 멤버를 한 명 이상 선택해 주세요.');
            return;
        }
        inFlight.current = true;
        setIsExporting(true);
        trigger?.();
        try {
            const query = new URLSearchParams({ week, view, theme });
            memberIds.forEach(id => query.append('member', id));
            const response = await fetch(`/api/mobile/v1/schedule/image?${query}`);
            if (!response.ok || response.headers.get('Content-Type') !== 'image/png') throw new Error('PNG unavailable');
            const blob = await addWebFontHeading(await response.blob(), theme);
            const filename = `hanavi-${week.replaceAll(' ', '')}.png`;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
            toast.success('PNG 다운로드를 시작했어요.');
        } catch {
            toast.error('시간표 이미지를 만들지 못했어요.');
        } finally {
            inFlight.current = false;
            setIsExporting(false);
        }
    };

    return { exportImage, isExporting };
}
