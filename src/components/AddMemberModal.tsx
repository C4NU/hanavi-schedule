import { useState, useEffect } from 'react';
import { CharacterSchedule } from '@/types/schedule';

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (character: Omit<CharacterSchedule, 'schedule'>) => Promise<void>;
}

export default function AddMemberModal({ isOpen, onClose, onAdd }: AddMemberModalProps) {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        avatarUrl: '',
        chzzkUrl: '',
        youtubeChannelId: '',
        youtubeReplayUrl: '',

        regularHoliday: '', // Comma separated days
        defaultTime: '',
        sortOrder: '',
        colorBg: '#ffffff',
        colorBorder: '#ffb6c1'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Auto-calculate Sort Order based on Default Time
    useEffect(() => {
        if (!formData.defaultTime) return;

        // Reference: Existing members' times and orders (approximate)
        const REFERENCE_TIMES = [
            { time: '08:00', order: 1 },
            { time: '10:00', order: 2 },
            { time: '12:00', order: 3 },
            { time: '14:00', order: 4 },
            { time: '15:00', order: 5 },
            { time: '17:00', order: 6 },
            { time: '19:00', order: 7 },
            { time: '24:00', order: 8 }
        ];

        const inputTime = formData.defaultTime.trim();
        // Simple regex check for HH:MM format (optional, but good for safety)
        if (!/^\d{2}:\d{2}$/.test(inputTime)) return;

        // Find insertion point
        let newOrder = 9; // Default if later than everyone

        for (let i = 0; i < REFERENCE_TIMES.length; i++) {
            if (inputTime < REFERENCE_TIMES[i].time) {
                // If input time is earlier than this ref time, take its order.
                // Assuming we want to shift others down? Or just place it "at" this slot index?
                // The user request said: "09:00 -> between 08:00(1) and 10:00(2) -> 2".
                // So if it's smaller than 10:00 (order 2), it becomes 2.
                // Correct logic: if input < ref.time, we take ref.order.
                newOrder = REFERENCE_TIMES[i].order;
                break;
            } else if (inputTime === REFERENCE_TIMES[i].time) {
                // If same time, place after or same? Let's say same order + 1 to be next to it?
                // Or just same order. Let's use same order + 1 to avoid direct collision if possible, 
                // or just same order relying on secondary sort.
                // Let's stick to "next available slot" logic roughly. 
                // If 19:00, ref is order 7. newOrder should probably be 8 (after Ruvi) or 7 (with Ruvi).
                // Let's set it to ref.order + 1 if equal.
                newOrder = REFERENCE_TIMES[i].order + 1;
                break;
            }
        }

        // Only update if the user hasn't typed something custom? 
        // User said: "입력후에 내가 수정하는것도 가능하게 해야해" (Editable after input)
        // Auto-fill usually implies overwriting when the source changes.
        setFormData(prev => ({ ...prev, sortOrder: newOrder.toString() }));

    }, [formData.defaultTime]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onAdd({
                ...formData,
                sortOrder: formData.sortOrder ? parseInt(formData.sortOrder) : undefined,
                colorTheme: 'universe' // Default
            });
            onClose();
            // Reset form
            setFormData({
                id: '',
                name: '',
                avatarUrl: '',
                chzzkUrl: '',
                youtubeChannelId: '',
                youtubeReplayUrl: '',
                regularHoliday: '',
                defaultTime: '',
                sortOrder: '',
                colorBg: '#ffffff',
                colorBorder: '#ffb6c1'
            });
        } catch (error) {
            console.error('Failed to add member:', error);
            alert('멤버 추가에 실패했습니다. ID가 중복되지 않는지 확인해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-scale-in">

                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">✨ 새 멤버 추가</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">ID (영문, 고유값)</label>
                            <input required name="id" value={formData.id} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none font-mono text-sm" placeholder="ex: newmember" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">이름 (한글/표시용)</label>
                            <input required name="name" value={formData.name} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm" placeholder="ex: 뉴멤버" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">프로필 이미지 URL</label>
                        <input required name="avatarUrl" value={formData.avatarUrl} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="https://..." />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">치지직 채널 URL</label>
                        <input name="chzzkUrl" value={formData.chzzkUrl} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="https://chzzk.naver.com/..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">YouTube 채널 ID/Link</label>
                            <input name="youtubeChannelId" value={formData.youtubeChannelId} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="Channel ID or URL" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">다시보기 채널 URL</label>
                            <input name="youtubeReplayUrl" value={formData.youtubeReplayUrl} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="https://youtube.com/..." />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">기본 방송 시작 시간</label>
                            <input
                                name="defaultTime"
                                value={formData.defaultTime}
                                onChange={handleChange}
                                onBlur={() => {
                                    // Auto-format "13" -> "13:00"
                                    if (/^\d{1,2}$/.test(formData.defaultTime)) {
                                        let hour = parseInt(formData.defaultTime);
                                        // Simple validation 0-24
                                        if (hour >= 0 && hour <= 24) {
                                            setFormData(prev => ({
                                                ...prev,
                                                defaultTime: `${hour.toString().padStart(2, '0')}:00`
                                            }));
                                        }
                                    }
                                }}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono"
                                placeholder="ex: 19:00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">정렬 순서 (숫자)</label>
                            <input type="number" name="sortOrder" value={formData.sortOrder} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="ex: 99" />
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 mb-3 block">정기 휴방 요일 선택</label>
                        <div className="flex gap-2 justify-between">
                            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => {
                                            const currentHolidays = prev.regularHoliday ? prev.regularHoliday.split(',') : [];
                                            const newHolidays = currentHolidays.includes(day)
                                                ? currentHolidays.filter(d => d !== day)
                                                : [...currentHolidays, day];
                                            return { ...prev, regularHoliday: newHolidays.join(',') };
                                        });
                                    }}
                                    className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center transition-all
                                        ${formData.regularHoliday?.includes(day)
                                            ? 'bg-pink-500 text-white shadow-md'
                                            : 'bg-white border border-gray-200 text-gray-400 hover:bg-gray-100'}
                                    `}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 mb-3 block">스케줄 셀 색상 설정</label>
                        <div className="flex gap-6 items-center">
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-xs text-gray-400">배경색</span>
                                <div className="flex flex-col gap-1">
                                    <input type="color" name="colorBg" value={formData.colorBg} onChange={handleChange} className="w-full h-10 rounded cursor-pointer" />
                                    <input type="text" name="colorBg" value={formData.colorBg} onChange={handleChange} className="w-20 p-1 text-xs border rounded font-mono text-center uppercase" maxLength={7} />
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-xs text-gray-400">테두리/강조색</span>
                                <div className="flex flex-col gap-1">
                                    <input type="color" name="colorBorder" value={formData.colorBorder} onChange={handleChange} className="w-full h-10 rounded cursor-pointer" />
                                    <input type="text" name="colorBorder" value={formData.colorBorder} onChange={handleChange} className="w-20 p-1 text-xs border rounded font-mono text-center uppercase" maxLength={7} />
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="flex-1 ml-4">
                                <div className="text-xs text-gray-400 mb-1 text-center">미리보기</div>
                                <div
                                    className="w-full h-16 rounded-xl flex items-center justify-center font-bold shadow-sm"
                                    style={{
                                        backgroundColor: formData.colorBg,
                                        border: `2px solid ${formData.colorBorder}`,
                                        color: formData.colorBorder
                                    }}
                                >
                                    {formData.name || '미리보기'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-pink-500 text-white rounded-xl font-bold text-lg hover:bg-pink-600 transition-all shadow-lg shadow-pink-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {isSubmitting ? '추가 중...' : '멤버 추가하기'}
                    </button>

                </form>
            </div>
        </div>
    );
}
