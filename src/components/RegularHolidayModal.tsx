import { useState, useEffect } from 'react';
import { CharacterSchedule } from '@/types/schedule';

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
                    : []; // If empty, could fallback to defaults, but better to show what's currently in DB/state
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <span>📅</span> 정기 휴방 관리
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            멤버별 정기 휴방 요일을 설정합니다. 설정된 내용은 '전체 저장' 시 DB에 반영됩니다.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors">
                        &times;
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {characters.map(char => (
                            <div key={char.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="relative">
                                        <img
                                            src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`}
                                            alt={char.name}
                                            className="w-12 h-12 rounded-full bg-gray-100 object-cover border-2 border-white shadow-sm"
                                        />
                                        <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${(localHolidays[char.id]?.length || 0) > 0 ? 'bg-green-400' : 'bg-gray-300'
                                            }`} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg text-gray-800">{char.name}</div>
                                        <div className="text-xs text-gray-400 font-mono">
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
                                                onClick={() => toggleDay(char.id, day)}
                                                className={`
                                                    aspect-square rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all
                                                    ${isSelected
                                                        ? 'bg-rose-500 text-white shadow-md transform scale-105'
                                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}
                                                `}
                                            >
                                                <span>{DAY_LABELS[idx]}</span>
                                                {isSelected && <span className="text-[10px]">OFF</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all transform active:scale-95"
                    >
                        적용하기
                    </button>
                </div>
            </div>
        </div>
    );
}
