"use client";

import React, { useState, useRef, useEffect } from 'react';
import { domToPng } from 'modern-screenshot';
import { toast } from 'sonner';
import { CharacterSchedule, ScheduleItem } from '@/types/schedule';
import { timeToMinutes } from '@/utils/date';
import DOMPurify from 'isomorphic-dompurify';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    characters: CharacterSchedule[];
    currentDate: Date;
    weekRangeString: string;
    onPrevWeek: () => void;
    onNextWeek: () => void;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export default function PersonalScheduleModal({
    isOpen,
    onClose,
    characters,
    currentDate,
    weekRangeString,
    onPrevWeek,
    onNextWeek
}: Props) {
    const [selectedCharId, setSelectedCharId] = useState<string>(characters[0]?.id || '');
    const [selectedTheme, setSelectedTheme] = useState<1 | 2 | 3>(1);
    const [isExporting, setIsExporting] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.7);

    // Dynamic Scale for Fit Preview
    useEffect(() => {
        if (!isOpen || !containerRef.current) return;
        
        const handleResize = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = containerRef.current.clientHeight;
                
                // Card native dimensions: 1000 x 562
                const scaleX = (containerWidth - 32) / 1000; // 32px padding
                const scaleY = (containerHeight - 32) / 562;
                
                // Choose the smaller scale to fit both width and height
                setScale(Math.min(1, scaleX, scaleY));
            }
        };

        handleResize();
        
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerRef.current);
        
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const selectedChar = characters.find(c => c.id === selectedCharId) || characters[0];
    if (!selectedChar) return null;

    // Get effective schedule item (including automatic merge for collab/group streams)
    const getEffectiveScheduleItem = (char: CharacterSchedule, day: string): ScheduleItem | undefined => {
        const myItem = char.schedule[day];
        
        // If own schedule is active and not off, use it.
        if (myItem && myItem.type !== 'off' && myItem.content) {
            return myItem;
        }

        // If own schedule is empty or off, check if there's any group collab on this day
        for (const otherChar of characters) {
            const otherItem = otherChar.schedule[day];
            if (otherItem && otherItem.content) {
                const isHanaviCollab = otherItem.type === 'collab_hanavi' || 
                                     otherItem.content.includes('하나비 합방') || 
                                     otherItem.content.includes('단체 방송') || 
                                     otherItem.content.includes('단체 합방');
                if (isHanaviCollab) {
                    return otherItem;
                }
            }
        }

        return myItem;
    };

    const handleExport = async () => {
        if (!cardRef.current) return;
        try {
            setIsExporting(true);
            toast.info('이미지 생성 중입니다. 잠시만 기다려주세요...');

            // Create temporary container for original scale rendering (avoids fit-cropping)
            const exportContainer = document.createElement('div');
            exportContainer.style.position = 'fixed';
            exportContainer.style.left = '-9999px';
            exportContainer.style.top = '0';
            exportContainer.style.width = '1000px';
            exportContainer.style.height = '562px';
            exportContainer.style.zIndex = '-9999';
            exportContainer.style.overflow = 'hidden';

            const clone = cardRef.current.cloneNode(true) as HTMLElement;
            clone.style.transform = 'none';
            clone.style.width = '1000px';
            clone.style.height = '562px';
            clone.style.transition = 'none';

            exportContainer.appendChild(clone);
            document.body.appendChild(exportContainer);

            // Wait for fonts and images
            await Promise.all([
                document.fonts.ready,
                new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 800))),
                ...Array.from(clone.querySelectorAll('img')).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                })
            ]);

            const dataUrl = await domToPng(clone, {
                backgroundColor: '#ffffff', // Set solid background color to fix transparent drop-shadow glitch
                scale: 2,
                width: 1000,
                height: 562
            });

            document.body.removeChild(exportContainer);
            setIsExporting(false);

            // Convert to blob and download
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            if (!blob) {
                toast.error('이미지 파일 생성에 실패했습니다.');
                return;
            }

            const fileName = `hanavi-${selectedChar.id}-schedule-${weekRangeString.replace(/ /g, '')}.png`;
            const link = document.createElement('a');
            link.download = fileName;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            
            toast.success('일정표 이미지가 성공적으로 저장되었습니다!');
        } catch (error) {
            console.error('Export failed:', error);
            setIsExporting(false);
            toast.error('이미지 저장 중 오류가 발생했습니다.');
        }
    };

    // Calculate Everytime top and height
    const getEverytimePosition = (timeStr: string) => {
        if (!timeStr) return { top: 0, height: 0, visible: false };
        const minutes = timeToMinutes(timeStr);
        const startMinutes = 10 * 60; // Start at 10:00 AM
        const relativeMinutes = minutes - startMinutes;
        
        // Hide if outside 10:00 ~ 24:00
        if (relativeMinutes < 0 || relativeMinutes > 14 * 60) {
            return { top: 0, height: 0, visible: false };
        }

        const hourHeight = 28; // 1 hour = 28px
        const top = (relativeMinutes / 60) * hourHeight;
        const height = 2 * hourHeight; // Default 2 hours block (56px)
        return { top, height, visible: true };
    };

    // Styles & Colors based on selected character key colors
    const charColorBg = selectedChar.colorBg || '#ffb6c1';
    const charColorBorder = selectedChar.colorBorder || '#ff85a2';
    const charEngName = selectedChar.id.toUpperCase();
    const avatarImgUrl = selectedChar.avatarUrl ? `/api/proxy/image?url=${encodeURIComponent(selectedChar.avatarUrl)}` : '';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            
            {/* Import Google Font Libre Caslon Display & CSS overrides for nested HTML tags */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&display=swap');
                
                .schedule-html-content * {
                    font-size: inherit !important;
                    line-height: inherit !important;
                }
            `}} />

            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col md:flex-row overflow-hidden animate-scale-in relative border border-pink-100 h-[90vh] max-h-[90vh]">
                
                {/* Left Panel: Controls */}
                <div className="w-full md:w-[320px] bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                            <span>✨</span> 개인 일정 카드 생성기
                        </h3>
                        <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                    </div>

                    {/* Member Select */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">멤버 선택</label>
                        <div className="grid grid-cols-3 gap-2">
                            {characters.map(char => (
                                <button
                                    key={char.id}
                                    onClick={() => setSelectedCharId(char.id)}
                                    className={`p-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                                        selectedCharId === char.id
                                            ? 'bg-pink-50 border-pink-200 text-pink-600 ring-2 ring-pink-100'
                                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'
                                    }`}
                                >
                                    {char.avatarUrl && (
                                        <img src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`} alt="" className="w-6 h-6 rounded-full object-cover" />
                                    )}
                                    <span>{char.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme Select */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">디자인 템플릿 선택</label>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setSelectedTheme(1)}
                                className={`w-full py-3 px-4 rounded-2xl text-sm font-bold border transition-all text-left flex items-center gap-3 ${
                                    selectedTheme === 1
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-100'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <span className="text-lg">🪪</span>
                                <span>디자인 1</span>
                            </button>
                            <button
                                onClick={() => setSelectedTheme(2)}
                                className={`w-full py-3 px-4 rounded-2xl text-sm font-bold border transition-all text-left flex items-center gap-3 ${
                                    selectedTheme === 2
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-100'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <span className="text-lg">📑</span>
                                <span>디자인 2</span>
                            </button>
                            <button
                                onClick={() => setSelectedTheme(3)}
                                className={`w-full py-3 px-4 rounded-2xl text-sm font-bold border transition-all text-left flex items-center gap-3 ${
                                    selectedTheme === 3
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-100'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <span className="text-lg">🗂️</span>
                                <span>디자인 3</span>
                            </button>
                        </div>
                    </div>

                    {/* Date Navigation */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">주차 선택</label>
                        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-2">
                            <button onClick={onPrevWeek} className="p-2 hover:bg-gray-100 rounded-xl transition-colors font-bold text-gray-500">◀</button>
                            <span className="text-xs font-extrabold text-gray-700">{weekRangeString}</span>
                            <button onClick={onNextWeek} className="p-2 hover:bg-gray-100 rounded-xl transition-colors font-bold text-gray-500">▶</button>
                        </div>
                    </div>

                    {/* Download Button */}
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full py-4 rounded-2xl bg-pink-500 hover:bg-pink-600 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-pink-100 transition-all flex items-center justify-center gap-2 mt-auto"
                    >
                        {isExporting ? (
                            <>
                                <span className="animate-spin">🔄</span>
                                <span>이미지 생성 중...</span>
                            </>
                        ) : (
                            <>
                                <span>📥</span>
                                <span>이미지 다운로드</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Right Panel: Preview Area */}
                <div 
                    ref={containerRef}
                    className="flex-1 p-4 bg-gray-100 flex items-center justify-center overflow-hidden relative min-h-[350px] md:min-h-[500px]"
                >
                    <button onClick={onClose} className="hidden md:block absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-3xl font-bold z-50">&times;</button>
                    
                    {/* Scale Wrapper to Fit in Container */}
                    <div
                        style={{
                            width: '1000px',
                            height: '562px',
                            transform: `scale(${scale})`,
                            transformOrigin: 'center center',
                            flexShrink: 0,
                            transition: 'transform 0.15s ease-out'
                        }}
                    >
                        {/* Capture Card */}
                        <div
                            ref={cardRef}
                            id="personal-schedule-card"
                            className="w-full h-full bg-white rounded-[32px] overflow-hidden flex relative select-none animate-fade-in"
                            style={{
                                isolation: 'isolate',
                                WebkitTransform: 'translate3d(0,0,0)',
                                transform: 'translate3d(0,0,0)'
                            }}
                        >
                            {/* ==============================================
                                THEME 1: 학생증 + 에타 시간표
                                ============================================== */}
                            {selectedTheme === 1 && (
                                <div className="w-full h-full p-8 flex gap-8 bg-[#fffbfe] relative overflow-hidden rounded-[32px]">
                                    {/* Sub grid background */}
                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:16px_16px]"></div>
                                    
                                    {/* Left Side: Everytime Timetable */}
                                    {/* Set bg-white (solid) instead of bg-white/90 to solve box-shadow alpha glitch */}
                                    <div className="flex-1 bg-white border border-gray-100 rounded-3xl p-5 flex flex-col h-full shadow-sm z-10">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-extrabold text-gray-800 flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: charColorBorder }}></span>
                                                {selectedChar.name}의 주간 시간표
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400">{weekRangeString}</span>
                                        </div>
                                        
                                        {/* Grid Layout */}
                                        <div className="flex-1 flex flex-col min-h-0 border border-gray-100 rounded-2xl overflow-hidden relative bg-gray-50/50">
                                            {/* Day Headers */}
                                            <div className="grid grid-cols-[35px_repeat(7,1fr)] border-b border-gray-100 bg-white py-1">
                                                <div className="text-[9px] font-extrabold text-gray-400 text-center flex items-center justify-center">시간</div>
                                                {DAY_LABELS.map((label, idx) => (
                                                    <div key={idx} className="text-[10px] font-extrabold text-gray-600 text-center flex items-center justify-center py-0.5 border-l border-gray-50">
                                                        {label}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Grid Timelines */}
                                            <div className="flex-1 relative overflow-hidden flex">
                                                {/* Left hour labels */}
                                                <div className="w-[35px] border-r border-gray-100 bg-white/70 flex flex-col">
                                                    {Array.from({ length: 8 }, (_, i) => 10 + i * 2).map(hour => (
                                                        <div key={hour} className="text-[9px] font-bold text-gray-400 text-center h-[56px] flex items-start justify-center pt-1 border-b border-gray-50/50">
                                                            {hour}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Columns for days */}
                                                <div className="flex-1 grid grid-cols-7 relative h-full bg-white/40">
                                                    {/* Vertical column lines */}
                                                    {DAYS.map((_, dayIdx) => (
                                                        <div key={dayIdx} className="h-full border-r border-gray-100/50 relative"></div>
                                                    ))}

                                                    {/* Horizontal hour lines inside columns */}
                                                    <div className="absolute inset-0 flex flex-col pointer-events-none">
                                                        {Array.from({ length: 14 }).map((_, i) => (
                                                            <div key={i} className="h-[28px] border-b border-gray-100/30 w-full"></div>
                                                        ))}
                                                    </div>

                                                    {/* Absolute blocks container */}
                                                    <div className="absolute inset-0 grid grid-cols-7">
                                                        {DAYS.map((day, colIdx) => {
                                                            const item = getEffectiveScheduleItem(selectedChar, day);
                                                            if (!item || !item.time || item.type === 'off') return null;

                                                            const { top, height, visible } = getEverytimePosition(item.time);
                                                            if (!visible) return null;

                                                            // Normalize content to NFC to fix Korean character separation issues
                                                            const cleanContent = item.content.normalize('NFC');

                                                            return (
                                                                <div key={day} className="relative h-full col-start-1 col-span-1" style={{ gridColumnStart: colIdx + 1 }}>
                                                                    <div
                                                                        className="absolute left-0.5 right-0.5 rounded-lg border p-1 flex flex-col justify-start overflow-hidden text-left shadow-[0_2px_8px_rgba(0,0,0,0.03)] z-10 transition-all"
                                                                        style={{
                                                                            top: `${top}px`,
                                                                            height: `${height}px`,
                                                                            backgroundColor: charColorBg,
                                                                            borderColor: charColorBorder,
                                                                            color: charColorBorder,
                                                                            lineHeight: '1.2'
                                                                        }}
                                                                    >
                                                                        <div className="text-[8px] font-extrabold opacity-95 mb-0.5 shrink-0">{item.time}</div>
                                                                        <div
                                                                            className="text-[8.5px] font-black leading-snug overflow-hidden line-clamp-4 select-none schedule-html-content"
                                                                            style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}
                                                                            dangerouslySetInnerHTML={{ 
                                                                                __html: DOMPurify.sanitize(cleanContent) 
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Student ID Card */}
                                    <div className="w-[390px] flex flex-col justify-center items-center h-full z-10 shrink-0">
                                        <div className="w-[370px] h-[230px] bg-white rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-gray-200/60 overflow-hidden flex flex-col relative">
                                            {/* Card header banner - Single line, centered alignment, Libre Caslon Display Font */}
                                            <div 
                                                className="h-[48px] w-full flex items-center justify-center px-4 font-normal text-white text-[13px] tracking-[0.1em] shadow-sm shrink-0 whitespace-nowrap" 
                                                style={{ 
                                                    backgroundColor: charColorBorder,
                                                    fontFamily: "'Libre Caslon Display', serif"
                                                }}
                                            >
                                                HANAVI GAKUIN HIGH SCHOOL
                                            </div>
                                            
                                            {/* Card Body */}
                                            <div className="flex-1 flex p-5 relative items-center">
                                                {/* Ghost background symbol */}
                                                <div className="absolute right-[-20px] bottom-[-20px] text-[180px] font-black pointer-events-none opacity-[0.03] select-none" style={{ color: charColorBorder }}>
                                                    {charEngName[0]}
                                                </div>

                                                {/* Photo */}
                                                <div className="w-[95px] h-[115px] border border-gray-200/80 rounded-xl overflow-hidden shadow-sm shrink-0 bg-gray-50 flex items-center justify-center">
                                                    {avatarImgUrl ? (
                                                        <img src={avatarImgUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <span className="text-2xl font-bold text-gray-300">{charEngName[0]}</span>
                                                    )}
                                                </div>

                                                {/* Info texts - Custom fonts, fixed enrollment date */}
                                                <div className="flex-1 pl-5 flex flex-col justify-between h-[115px] py-1 text-left relative z-10">
                                                    <div className="flex flex-col">
                                                        <span 
                                                            className="text-[28px] font-normal leading-none" 
                                                            style={{ 
                                                                color: charColorBorder,
                                                                fontFamily: "'Libre Caslon Display', serif"
                                                            }}
                                                        >
                                                            {charEngName}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 mt-2">Birth: {selectedChar.birthday || '알 수 없음'}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 mt-1">2025年 3月 29日 入学</span>
                                                    </div>
                                                    
                                                    {/* Stamps & Japanese Text */}
                                                    <div className="flex items-end justify-between">
                                                        <span className="text-[14px] font-extrabold text-gray-700 tracking-widest font-serif">
                                                            私立娜飛高校
                                                        </span>
                                                        {/* Seal Stamp */}
                                                        <div className="w-7 h-7 rounded-full border-2 border-red-500/80 flex items-center justify-center text-red-500/80 font-bold text-[8px] tracking-tighter select-none rotate-6 scale-110">
                                                            <span>娜飛印</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ==============================================
                                THEME 2: 구라식 리스트 뷰
                                ============================================== */}
                            {selectedTheme === 2 && (
                                <div 
                                    className="w-full h-full p-8 flex gap-8 relative overflow-hidden bg-gradient-to-br bg-white rounded-[32px]" 
                                    style={{ 
                                        backgroundImage: `linear-gradient(135deg, ${charColorBg}22 0%, ${charColorBorder}11 100%)`,
                                        isolation: 'isolate',
                                        WebkitTransform: 'translate3d(0,0,0)',
                                        transform: 'translate3d(0,0,0)',
                                        borderRadius: '32px'
                                    }}
                                >
                                    
                                    {/* Bubble/Circle Decor elements */}
                                    <div className="absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-25 top-[-50px] right-[-50px]" style={{ backgroundColor: charColorBorder }}></div>
                                    <div className="absolute w-[250px] h-[250px] rounded-full blur-[80px] opacity-25 bottom-[-50px] left-[-50px]" style={{ backgroundColor: charColorBg }}></div>

                                    {/* Left Side: List Schedule */}
                                    <div className="flex-1 flex flex-col justify-between h-full py-2 z-10 text-left">
                                        {/* Header styled cloud title */}
                                        <div className="mb-4">
                                            <h1 className="text-[34px] font-black tracking-wider text-gray-800 drop-shadow-sm flex items-center gap-3">
                                                <span className="px-5 py-1.5 rounded-3xl bg-white shadow-md border-2 border-gray-100 flex items-center gap-2">
                                                    <span style={{ color: charColorBorder }}>SCHEDULE</span>
                                                </span>
                                            </h1>
                                        </div>

                                        {/* Days listing - Changed bg-white/80 to solid bg-white to prevent export shadow glitches */}
                                        <div className="flex-1 flex flex-col gap-2 justify-between">
                                            {DAYS.map((day, idx) => {
                                                const item = getEffectiveScheduleItem(selectedChar, day);
                                                const isOff = !item || item.type === 'off';
                                                
                                                // Normalize content to NFC
                                                const cleanContent = item && item.content ? item.content.normalize('NFC') : '';

                                                return (
                                                    <div
                                                        key={day}
                                                        className="flex items-center gap-4 bg-white border border-gray-100 px-4 py-2 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all hover:scale-[1.01]"
                                                    >
                                                        {/* Day badge - Removed shadow-sm to prevent export shadow glitches */}
                                                        <div
                                                            className="w-14 h-8 flex items-center justify-center rounded-full font-black text-xs text-white shrink-0"
                                                            style={{ backgroundColor: charColorBorder }}
                                                        >
                                                            {day}
                                                        </div>
                                                        
                                                        {/* Schedule Detail */}
                                                        <div className="flex-1 flex items-center justify-between min-w-0 pr-2">
                                                            <div className="font-extrabold text-gray-700 text-[13px] truncate schedule-html-content">
                                                                {isOff ? (
                                                                    <span className="text-gray-400/80 font-bold">{selectedChar.name} 휴방 💤</span>
                                                                ) : (
                                                                    <span
                                                                        dangerouslySetInnerHTML={{ 
                                                                            __html: DOMPurify.sanitize(cleanContent) 
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                            {!isOff && item.time && (
                                                                <div className="font-black text-gray-500 text-xs shrink-0 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                                                                    {item.time}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Right Side: Framed Profile */}
                                    <div className="w-[360px] flex flex-col justify-center items-center h-full z-10 shrink-0">
                                        <div className="w-[250px] h-[340px] bg-white p-3 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] rotate-3 border-2 border-white relative group overflow-hidden">
                                            <div className="w-full h-[260px] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                                                {avatarImgUrl ? (
                                                    <img src={avatarImgUrl} alt="" className="w-full h-full object-cover scale-105" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl font-extrabold text-gray-200">
                                                        {charEngName[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col items-center justify-center pt-3 text-center">
                                                <span className="text-lg font-black tracking-widest" style={{ color: charColorBorder }}>
                                                    {selectedChar.name}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold tracking-tight">Week of {weekRangeString}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ==============================================
                                THEME 3: 구라식 그리드 뷰
                                ============================================== */}
                            {selectedTheme === 3 && (
                                <div 
                                    className="w-full h-full p-8 flex gap-8 relative overflow-hidden bg-gradient-to-br bg-white rounded-[32px]" 
                                    style={{ 
                                        backgroundImage: `linear-gradient(135deg, ${charColorBorder}22 0%, ${charColorBg}11 100%)`,
                                        isolation: 'isolate',
                                        WebkitTransform: 'translate3d(0,0,0)',
                                        transform: 'translate3d(0,0,0)',
                                        borderRadius: '32px'
                                    }}
                                >
                                    
                                    {/* Bubble/Circle Decor elements */}
                                    <div className="absolute w-[350px] h-[350px] rounded-full blur-[90px] opacity-25 top-[-100px] left-[-50px]" style={{ backgroundColor: charColorBg }}></div>
                                    <div className="absolute w-[250px] h-[250px] rounded-full blur-[80px] opacity-20 bottom-[-50px] right-[-50px]" style={{ backgroundColor: charColorBorder }}></div>

                                    {/* Left Side: Grid Layout Schedule */}
                                    <div className="flex-1 flex flex-col justify-between h-full py-2 z-10 text-left">
                                        {/* Header */}
                                        <div className="mb-4">
                                            <h1 className="text-[34px] font-black tracking-wider text-gray-800 drop-shadow-sm flex items-center gap-3">
                                                <span className="px-5 py-1.5 rounded-3xl bg-white shadow-md border-2 border-gray-100 flex items-center gap-2">
                                                    <span style={{ color: charColorBorder }}>SCHEDULE</span>
                                                </span>
                                            </h1>
                                        </div>

                                        {/* Grid Cards - 2 Columns (7 days) - Changed bg-white/80 to bg-white to avoid export shadow bugs */}
                                        <div className="flex-1 grid grid-cols-2 gap-3">
                                            {DAYS.map((day, idx) => {
                                                const item = getEffectiveScheduleItem(selectedChar, day);
                                                const isOff = !item || item.type === 'off';
                                                const isSunday = day === 'SUN';
                                                
                                                // Normalize content to NFC
                                                const cleanContent = item && item.content ? item.content.normalize('NFC') : '';

                                                return (
                                                    <div
                                                        key={day}
                                                        className={`bg-white border border-gray-100 p-3 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all hover:scale-[1.01] ${isSunday ? 'col-span-2 flex-row items-center gap-4 py-2.5' : ''}`}
                                                    >
                                                        {/* Day top row */}
                                                        <div className={`flex items-center justify-between ${isSunday ? 'shrink-0' : 'mb-1'}`}>
                                                            <span
                                                                className="px-3 py-0.5 rounded-full font-black text-[10px] text-white"
                                                                style={{ backgroundColor: charColorBorder }}
                                                            >
                                                                {day}
                                                            </span>
                                                            {!isSunday && !isOff && item.time && (
                                                                <span className="text-[10px] font-black text-gray-400">
                                                                    {item.time}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Content bottom row */}
                                                        <div className="flex-1 flex flex-col justify-center min-w-0">
                                                            <div className="font-extrabold text-gray-700 text-[12px] break-all leading-snug line-clamp-2 schedule-html-content">
                                                                {isOff ? (
                                                                    <span className="text-gray-400/80 font-bold">{selectedChar.name} 휴방 💤</span>
                                                                ) : (
                                                                    <span
                                                                        dangerouslySetInnerHTML={{ 
                                                                            __html: DOMPurify.sanitize(cleanContent) 
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>

                                                        {isSunday && !isOff && item.time && (
                                                            <span className="text-[10px] font-black text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded shrink-0">
                                                                {item.time}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Right Side: Framed Profile */}
                                    <div className="w-[360px] flex flex-col justify-center items-center h-full z-10 shrink-0">
                                        <div className="w-[250px] h-[340px] bg-white p-3 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] -rotate-3 border-2 border-white relative group overflow-hidden">
                                            <div className="w-full h-[260px] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                                                {avatarImgUrl ? (
                                                    <img src={avatarImgUrl} alt="" className="w-full h-full object-cover scale-105" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl font-extrabold text-gray-200">
                                                        {charEngName[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col items-center justify-center pt-3 text-center">
                                                <span className="text-lg font-black tracking-widest" style={{ color: charColorBorder }}>
                                                    {selectedChar.name}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold tracking-tight">Week of {weekRangeString}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
