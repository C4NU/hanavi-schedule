import { useState } from 'react';
import { domToPng } from 'modern-screenshot';
import { toast } from 'sonner';

export function useExportSchedule(trigger?: (pattern?: any) => void) {
    const [isExporting, setIsExporting] = useState(false);

    const exportImage = async (scheduleRef: React.RefObject<HTMLDivElement | null>, defaultPatterns: any) => {
        if (trigger) trigger();
        if (!scheduleRef.current) return;

        try {
            setIsExporting(true);
            
            // Create a dedicated export container (hidden)
            const exportContainer = document.createElement('div');
            exportContainer.style.position = 'fixed';
            exportContainer.style.left = '-9999px';
            exportContainer.style.top = '0';
            exportContainer.style.width = '1400px';
            
            // Clone the element
            const clone = scheduleRef.current.cloneNode(true) as HTMLElement;
            
            // IMPORTANT: Add data-exporting to the WRAPPER instead of root to avoid global UI break
            // Wrap it in a div with the class that matches CSS module
            const wrapper = document.createElement('div');
            wrapper.className = scheduleRef.current.parentElement?.className || '';
            wrapper.setAttribute('data-exporting', 'true');
            wrapper.appendChild(clone);
            
            exportContainer.appendChild(wrapper);
            document.body.appendChild(exportContainer);
            
            // Wait for rendering and images
            await Promise.all([
                document.fonts.ready,
                new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 1500))),
                ...Array.from(clone.querySelectorAll('img')).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                })
            ]);
            
            const dataUrl = await domToPng(clone, {
                backgroundColor: '#fff0f5',
                scale: 2,
            });

            // Cleanup
            if (exportContainer.parentNode) {
                document.body.removeChild(exportContainer);
            }
            setIsExporting(false);

            // Convert dataUrl to blob
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            
            if (!blob) {
                toast.error('이미지 생성에 실패했습니다.');
                return;
            }

            const fileName = `hanabi-schedule-${new Date().toISOString().slice(0, 10)}.png`;

            // Check for Web Share API support (targeting mobile/tablet)
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile && navigator.share && navigator.canShare) {
                const file = new File([blob], fileName, { type: 'image/png' });
                const shareData = {
                    files: [file],
                    title: '하나비 주간 스케줄',
                };

                if (navigator.canShare(shareData)) {
                    try {
                        if (trigger) trigger(defaultPatterns?.success);
                        await navigator.share(shareData);
                        return;
                    } catch (err) {
                        // Ignore AbortError (user cancelled share)
                        if ((err as Error).name === 'AbortError') return;
                        console.error('Share failed:', err);
                        // Fall through to download if share fails
                    }
                }
            }

            // Fallback: Legacy download (Desktop)
            const link = document.createElement('a');
            link.download = fileName;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            if (link.parentNode) {
                document.body.removeChild(link);
            }
            URL.revokeObjectURL(link.href);
            toast.success('이미지가 성공적으로 저장되었습니다.');

        } catch (error) {
            console.error('Export failed:', error);
            setIsExporting(false);
            toast.error('이미지 저장 중 오류가 발생했습니다.');
        }
    };

    return { exportImage, isExporting };
}
