import { useState, useEffect } from 'react';
import { CharacterSchedule } from '@/types/schedule';
import BaseModal from './BaseModal';

interface RegularHolidayModalProps {
    isOpen: boolean;
    onClose: () => void;
    characters: CharacterSchedule[];
    onApply: (updates: { id: string, holidays: string }[]) => void;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export default function RegularHolidayModal({ isOpen, onClose, characters, onApply }: RegularHolidayModalProps) {
    const [localHolidays, setLocalHolidays] = useState<{ [key: string]: string[] }>({});

    useEffect(() => {
        if (isOpen) {
            const initialstate: { [key: string]: string[] } = {};
            characters.forEach(char => {
                const holidays = char.regularHoliday
                    ? char.regularHoliday.split(',').map(d => d.trim())
                    : [];
                initialstate[char.id] = holidays;
            });
            setLocalHolidays(initialstate);
        }
    }, [isOpen, characters]);

    const toggleDay = (charId: string, day: string) => {
        setLocalHolidays(prev => {
            const current = prev[charId] || [];
            if (current.includes(day)) {
                return { ...prev, [charId]: current.filter(d => d !== day) };
            } else {
                return { ...prev, [charId]: [...current, day] };
            }
        });
    };

    const handleSave = () => {
        const updates = Object.entries(localHolidays).map(([id, holidays]) => ({
            id,
            holidays: holidays.join(',')
        }));
        onApply(updates);
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="📅 정기 휴방 관리"
            maxWidth="800px"
        >
            <div className="space-y-4">
                <p className="text-gray-500 text-sm mb-6">
                    멤버별 정기 휴방 요일을 설정합니다. 설정된 내용은 '전체 저장' 시 DB에 반영됩니다.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {characters.map(char => (
                        <div key={char.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative">
                                    <img
                                        src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`}
                                        alt={char.name}
                                        className="w-10 h-10 rounded-full bg-gray-200 object-cover border-2 border-white shadow-sm"
                                    />
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${(localHolidays[char.id]?.length || 0) > 0 ? 'bg-pink-500' : 'bg-gray-300'}`} />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-800">{char.name}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">
                                        {(localHolidays[char.id]?.length || 0) === 0 ? '휴방일 없음' : localHolidays[char.id]?.join(', ')}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                                {DAYS.map((day, idx) => {
                                    const isSelected = localHolidays[char.id]?.includes(day);
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(char.id, day)}
                                            className={`
                                                aspect-square rounded-lg text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all
                                                ${isSelected
                                                    ? 'bg-pink-500 text-white shadow-sm transform scale-105'
                                                    : 'bg-white border text-gray-400 hover:bg-gray-100'}
                                            `}
                                        >
                                            <span>{DAY_LABELS[idx]}</span>
                                            {isSelected && <span className="text-[8px] opacity-70">OFF</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-3.5 rounded-xl bg-pink-500 text-white font-bold hover:bg-pink-600 shadow-lg shadow-pink-100 transition-all active:scale-95"
                    >
                        일괄 적용하기
                    </button>
                </div>
            </div>
        </BaseModal>
    );
}
