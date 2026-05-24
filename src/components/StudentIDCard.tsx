import React from 'react';
import { CharacterSchedule } from '@/types/schedule';

interface StudentIDCardProps {
    character: CharacterSchedule;
    className?: string;
    style?: React.CSSProperties;
}

export const StudentIDCard: React.FC<StudentIDCardProps> = ({ character, className = '', style }) => {
    const isIriya = character.id === 'iriya';
    const charColorBg = character.colorBg || '#ffb6c1';
    const charColorBorder = character.colorBorder || '#ff85a2';
    const charEngName = character.id.toUpperCase();
    const avatarImgUrl = character.avatarUrl ? `/api/proxy/image?url=${encodeURIComponent(character.avatarUrl)}` : '';

    if (isIriya) {
        // 이리야 전용 MAIVI 학생증 디자인
        return (
            <div 
                className={`w-[370px] h-[230px] bg-[#e8e4db] rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-gray-300/40 overflow-hidden flex flex-col relative text-left select-none ${className}`}
                style={{
                    ...style,
                    fontFamily: "'Inter', sans-serif"
                }}
            >
                {/* 폰트 로드 */}
                <style dangerouslySetInnerHTML={{ __html: `
                    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Libre+Caslon+Display&family=Cinzel:wght@500;700&display=swap');
                `}} />

                {/* Card header banner - MAIVI Black style */}
                <div 
                    className="h-[48px] w-full flex items-center justify-between px-6 font-normal text-white text-[12px] tracking-[0.15em] shadow-sm shrink-0 bg-[#282828] relative" 
                    style={{ 
                        fontFamily: "'Cinzel', serif"
                    }}
                >
                    <span>STUDENT ID CARD</span>
                    <span className="text-[9px] text-white/80">▶</span>
                </div>
                
                {/* Card Body */}
                <div className="flex-1 flex p-5 relative items-center gap-4 bg-[#e8e4db]">
                    {/* Photo */}
                    <div className="w-[95px] h-[115px] border border-[#282828]/60 rounded-lg overflow-hidden shadow-sm shrink-0 bg-gray-50 flex items-center justify-center relative z-10">
                        {avatarImgUrl ? (
                            <img src={avatarImgUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <span className="text-2xl font-bold text-gray-300">I</span>
                        )}
                    </div>

                    {/* Info texts */}
                    <div className="flex-1 flex flex-col justify-between h-[115px] py-0.5 text-left relative z-10 text-[#282828]">
                        {/* ID Number & Heart Badge */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-[#282828] text-[#e8e4db] px-2 py-0.5 text-[8.5px] font-black tracking-wider rounded font-mono">
                                ID No. 20251122-1
                            </span>
                            {/* [MAM] 로고 SVG */}
                            <svg className="w-6 h-4 text-[#282828]" viewBox="0 0 24 16" fill="currentColor">
                                <path d="M12 4.419C12 4.419 10.082 1 7.5 1 5.015 1 3 3.015 3 5.5c0 3.082 4.102 6.643 9 9.5 4.898-2.857 9-6.418 9-9.5C21 3.015 18.985 1 16.5 1c-2.582 0-4.5 3.419-4.5 3.419z" />
                                <text x="12" y="8.5" fontSize="4.5" fontWeight="900" fill="#e8e4db" textAnchor="middle">MAM</text>
                            </svg>
                        </div>

                        {/* Details grid with underlines */}
                        <div className="flex-1 flex flex-col justify-between text-[9.5px] font-bold text-gray-700/90 gap-[3px]">
                            <div className="flex items-center border-b border-[#282828]/15 pb-0.5">
                                <span className="w-14 text-gray-500 font-medium">Name</span>
                                <span className="text-[#282828] font-normal text-[11px]" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Iriya Noir</span>
                            </div>
                            <div className="flex items-center border-b border-[#282828]/15 pb-0.5">
                                <span className="w-14 text-gray-500 font-medium">Birth</span>
                                <span className="text-[#282828] font-normal text-[10.5px]" style={{ fontFamily: "'Libre Caslon Display', serif" }}>19th, September</span>
                            </div>
                            <div className="flex items-center border-b border-[#282828]/15 pb-0.5">
                                <span className="w-14 text-gray-500 font-medium">Unit</span>
                                <span className="text-[#282828] font-normal text-[10px]" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Maivi of Hanavi Universe</span>
                            </div>
                            <div className="flex items-center relative h-[22px]">
                                <span className="w-14 text-gray-500 font-medium pt-1">Signature</span>
                                {/* Signature Handwriting */}
                                <span 
                                    className="text-[#1a1a1a] text-[18px] pl-2 absolute left-14 bottom-[-1px] font-bold z-20 select-none transform -rotate-3"
                                    style={{ fontFamily: "'Caveat', cursive" }}
                                >
                                    iriya
                                </span>
                                {/* Watermark behind the signature */}
                                <span className="absolute right-0 bottom-[-4px] text-[13px] font-extrabold text-[#282828]/10 tracking-tighter pointer-events-none font-serif italic select-none">
                                    May Girls High School
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 기본 HANAVI 고교 학생증 디자인
    return (
        <div 
            className={`w-[370px] h-[230px] bg-white rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-gray-200/60 overflow-hidden flex flex-col relative text-left select-none ${className}`}
            style={{
                ...style,
            }}
        >
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&display=swap');
            `}} />
            
            {/* Card header banner */}
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

                {/* Info texts */}
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
                        <span className="text-[10px] font-bold text-gray-400 mt-2">Birth: {character.birthday || '알 수 없음'}</span>
                        <span className="text-[10px] font-bold text-gray-400 mt-1">2025年 3月 29日 入학</span>
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
    );
};

export default StudentIDCard;
