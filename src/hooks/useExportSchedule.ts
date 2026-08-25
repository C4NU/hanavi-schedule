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
            // 내보내기 폭 = 실제 렌더링 폭 — 라이브와 동일한 레이아웃/폰트 크기로 캡처 (해상도는 scale로 확보)
            const liveWidth = Math.max(1200, Math.round(scheduleRef.current.getBoundingClientRect().width));
            const exportContainer = document.createElement('div');
            exportContainer.style.position = 'fixed';
            exportContainer.style.left = '-9999px';
            exportContainer.style.top = '0';
            exportContainer.style.width = `${liveWidth}px`;
            
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

            const isV2 = scheduleRef.current.getAttribute('data-theme') === 'v2';

            // 16:10 고정 — exportContainer에 확정 높이를 주고 체인(클론→컨테이너)을 100%로 채운다
            const container = clone.querySelector('div[data-theme="v2"][class*="container"]') as HTMLElement | null;
            exportContainer.style.height = `${Math.round(liveWidth / 1.6)}px`;
            clone.style.height = '100%';
            if (container) container.style.height = '100%';
            // 클론에 걸리는 기존 export 패딩(20px !important) 제거 — 정확한 16:10 (2200/1375 = 1.6) 보장
            clone.style.setProperty('padding', '0', 'important');
            // gridWrapper가 콘텐츠 높이 이하로 줄지 않는(flex min-height:auto) 것을 해제해야
            // 컨테이너 높이(1375) 안에 그리드가 수납된다
            const gridWrapper = clone.querySelector('[class*="gridWrapper"]') as HTMLElement | null;
            if (gridWrapper) {
                gridWrapper.style.minHeight = '0';
                gridWrapper.style.overflow = 'hidden';
            }
            const viewContainer = clone.querySelector('[class*="viewContainer"]') as HTMLElement | null;
            const memberGrid = viewContainer?.querySelector(':scope > div') as HTMLElement | null;
            if (viewContainer && memberGrid) {
                const rowCount = clone.querySelectorAll('[class*="charCell"]').length;
                viewContainer.style.height = '100%';
                memberGrid.style.height = '100%';
                memberGrid.style.gridTemplateRows = `auto repeat(${rowCount}, minmax(0, 1fr))`;
            }

            // v2 내보내기: 인터랙션 요소(주 네비/날짜 선택기)를 숨기고 정적 날짜를 인라인 스타일로 표시
            // (CSS 클래스 기반 스타일링은 modern-screenshot의 스타일 인라이닝에서 clamp/vw 조합이 깨지므로 px 인라인으로 제어)
            if (isV2) {
                const dateNav = clone.querySelector('[class*="dateNav"]') as HTMLElement | null;
                if (dateNav) dateNav.style.display = 'none';
                const exportDate = clone.querySelector('[class*="v2ExportDate"]') as HTMLElement | null;
                if (exportDate) {
                    exportDate.style.display = 'inline-block';
                    exportDate.style.color = '#f8b8cd';
                    exportDate.style.fontWeight = '600';
                    exportDate.style.fontSize = '26px';
                    exportDate.style.fontFamily = 'Montserrat, sans-serif';
                    exportDate.style.whiteSpace = 'nowrap';
                }

                // 그라데이션/그림자 렌더링 아티팩트 회피 — 대형 그라데이션은 단색 치환
                clone.querySelectorAll('[class*="v2Badge"]').forEach(el => {
                    const s = el as HTMLElement;
                    s.style.background = '#f472a6';
                    s.style.boxShadow = 'none';
                });
                clone.querySelectorAll('[class*="gridWrapper"]').forEach(el => {
                    (el as HTMLElement).style.background = '#ffe9f0';
                });
                clone.querySelectorAll('[class*="scheduleCell"], [class*="charCell"]').forEach(el => {
                    (el as HTMLElement).style.boxShadow = 'none';
                });

                // 멤버 셀: 클론 cascade 불안정으로 이름 배지가 classic 위치(blur+하단)로 렌더링되는 것 방지
                // — v2 위치/스타일을 인라인으로 확정
                clone.querySelectorAll('[class*="blurLayer"]').forEach(el => {
                    (el as HTMLElement).style.display = 'none';
                });
                // 내보내기 전용: 내용 텍스트 확대 (행 기준 확대 — ▸ 화살표 정렬 유지)
                clone.querySelectorAll('[class*="v2ContentRow"]').forEach(el => {
                    (el as HTMLElement).style.setProperty('font-size', '16px', 'important');
                });
                clone.querySelectorAll('[class*="charCell"]').forEach(cell => {
                    const cellEl = cell as HTMLElement;
                    const memberColor = cellEl.style.getPropertyValue('--member-color') || '#ff8fab';
                    cellEl.style.boxShadow = 'none';
                    const overlay = cell.querySelector('[class*="nameOverlay"]') as HTMLElement | null;
                    if (overlay) {
                        overlay.style.inset = 'auto';
                        overlay.style.top = '-7px';
                        overlay.style.left = '-7px';
                        overlay.style.width = 'calc(100% + 14px)';
                        overlay.style.height = 'auto';
                        overlay.style.alignItems = 'flex-start';
                        overlay.style.justifyContent = 'flex-start';
                        overlay.style.position = 'absolute';
                        overlay.style.display = 'flex';
                        overlay.style.overflow = 'visible';
                    }
                    const nameText = cell.querySelector('[class*="nameText"]') as HTMLElement | null;
                    if (nameText) {
                        nameText.style.background = memberColor;
                        nameText.style.fontFamily = getComputedStyle(nameText).fontFamily;
                    }
                });
            }

            const dataUrl = await domToPng(clone, {
                // v2 테마는 흰 페이지 캔버스, classic은 기존 핑크 배경
                backgroundColor: isV2 ? '#ffffff' : '#fff0f5',
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
