import { useState, useEffect } from 'react';
import { CharacterSchedule } from '@/types/schedule';
import { toast } from 'sonner';
import BaseModal from './BaseModal';

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
        cimeUrl: '',
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
                newOrder = REFERENCE_TIMES[i].order;
                break;
            } else if (inputTime === REFERENCE_TIMES[i].time) {
                newOrder = REFERENCE_TIMES[i].order + 1;
                break;
            }
        }

        setFormData(prev => ({ ...prev, sortOrder: newOrder.toString() }));

    }, [formData.defaultTime]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onAdd({
                ...formData,
                sortOrder: formData.sortOrder ? parseInt(formData.sortOrder) : undefined,
                colorTheme: formData.id,
                status: 'active'
            });
            onClose();
            // Reset form
            setFormData({
                id: '',
                name: '',
                avatarUrl: '',
                chzzkUrl: '',
                cimeUrl: '',
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
            toast.error('멤버 추가에 실패했습니다. ID가 중복되지 않는지 확인해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="✨ 새 멤버 추가"
            maxWidth="600px"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">씨미(CIME) 채널 URL (직통)</label>
                        <input name="cimeUrl" value={formData.cimeUrl || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="https://cime.live/..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">또는 치지직(Chzzk) ID (폴백)</label>
                        <input name="chzzkUrl" value={formData.chzzkUrl || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="ID만 입력 (링크 자동생성)" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">YouTube 채널 ID/Link</label>
                        <input name="youtubeChannelId" value={formData.youtubeChannelId || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="Channel ID or URL" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">다시보기 채널 URL</label>
                        <input name="youtubeReplayUrl" value={formData.youtubeReplayUrl || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="https://youtube.com/..." />
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
                                if (/^\d{1,2}$/.test(formData.defaultTime)) {
                                    let hour = parseInt(formData.defaultTime);
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
                    <label className="block text-xs font-bold text-gray-500 mb-3">정기 휴방 요일 선택</label>
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
                                className={`w-10 h-10 rounded-full font-bold text-[10px] flex items-center justify-center transition-all
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
                    <label className="block text-xs font-bold text-gray-500 mb-3">스케줄 셀 색상 설정</label>
                    <div className="flex gap-6 items-center">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">배경색</span>
                            <div className="flex gap-2 items-center">
                                <input type="color" name="colorBg" value={formData.colorBg} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer p-0 border-none bg-transparent" />
                                <input type="text" name="colorBg" value={formData.colorBg} onChange={handleChange} className="w-16 p-1 text-[10px] border rounded font-mono text-center uppercase" maxLength={7} />
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">테두리색</span>
                            <div className="flex gap-2 items-center">
                                <input type="color" name="colorBorder" value={formData.colorBorder} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer p-0 border-none bg-transparent" />
                                <input type="text" name="colorBorder" value={formData.colorBorder} onChange={handleChange} className="w-16 p-1 text-[10px] border rounded font-mono text-center uppercase" maxLength={7} />
                            </div>
                        </div>

                        <div className="flex-1 ml-4">
                            <div
                                className="w-full h-12 rounded-xl flex items-center justify-center font-bold shadow-sm border text-xs"
                                style={{
                                    backgroundColor: formData.colorBg,
                                    borderColor: formData.colorBorder,
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
                    className="w-full py-4 bg-pink-500 text-white rounded-xl font-bold text-lg hover:bg-pink-600 transition-all shadow-lg shadow-pink-100 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                    {isSubmitting ? '추가 중...' : '멤버 추가하기'}
                </button>
            </form>
        </BaseModal>
    );
}
