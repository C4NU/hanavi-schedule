"use client";

import { useState, useEffect } from 'react';
import { CharacterSchedule } from '@/types/schedule';
import { toast } from 'sonner';
import BaseModal from './BaseModal';
import controls from './ScheduleHeader.module.css';
import adminStyles from './admin/AdminSchedule.module.css';

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
    const [isFetchingProfile, setIsFetchingProfile] = useState(false);

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

    const fetchCimeProfile = async () => {
        if (!formData.chzzkUrl) {
            toast.error('치지직/씨미 ID를 먼저 입력해주세요.');
            return;
        }
        
        setIsFetchingProfile(true);
        try {
            const res = await fetch(`/api/cime/profile?channelId=${encodeURIComponent(formData.chzzkUrl)}`);
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch profile');
            }
            
            if (data.channelImageUrl) {
                setFormData((prev: any) => ({ ...prev, avatarUrl: data.channelImageUrl }));
                toast.success('프로필 이미지를 성공적으로 가져왔습니다.');
            } else {
                toast.error('프로필 이미지를 찾을 수 없습니다.');
            }
        } catch (error: any) {
            console.error('Failed to fetch cime profile:', error);
            toast.error(`프로필 가져오기 실패: ${error.message}`);
        } finally {
            setIsFetchingProfile(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="새 멤버 추가"
            variant="sheet"
            maxWidth="600px"
        >
            <form onSubmit={handleSubmit} className={adminStyles.sheetBody}>
                <div className={adminStyles.memberFields}>
                    <div>
                        <label htmlFor="add-member-id" className="block text-xs font-bold text-[var(--control-text)] mb-1">ID (영문, 고유값)</label>
                        <input id="add-member-id" required name="id" value={formData.id} onChange={handleChange} placeholder="ex: newmember" />
                    </div>
                    <div>
                        <label htmlFor="add-member-name" className="block text-xs font-bold text-[var(--control-text)] mb-1">이름 (한글/표시용)</label>
                        <input id="add-member-name" required name="name" value={formData.name} onChange={handleChange} placeholder="ex: 뉴멤버" />
                    </div>
                </div>

                <div>
                    <label htmlFor="add-member-avatarUrl" className="block text-xs font-bold text-[var(--control-text)] mb-1">프로필 이미지 URL</label>
                    <div className={adminStyles.inlineField}>
                        <input id="add-member-avatarUrl" required name="avatarUrl" value={formData.avatarUrl} onChange={handleChange} placeholder="https://..." />
                        <button 
                            type="button" 
                            onClick={fetchCimeProfile}
                            disabled={isFetchingProfile || !formData.chzzkUrl}
                            className={controls.button}
                        >
                            {isFetchingProfile ? '로딩중...' : '씨미 연동'}
                        </button>
                    </div>
                </div>

                <div className={adminStyles.memberFields}>
                    <div>
                        <label htmlFor="add-member-cimeUrl" className="block text-xs font-bold text-[var(--control-text)] mb-1">씨미(CIME) 채널 URL (직통)</label>
                        <input id="add-member-cimeUrl" name="cimeUrl" value={formData.cimeUrl || ''} onChange={handleChange} placeholder="https://cime.live/..." />
                    </div>
                    <div>
                        <label htmlFor="add-member-chzzkUrl" className="block text-xs font-bold text-[var(--control-text)] mb-1">또는 치지직(Chzzk) ID (폴백)</label>
                        <input id="add-member-chzzkUrl" name="chzzkUrl" value={formData.chzzkUrl || ''} onChange={handleChange} placeholder="ID만 입력 (링크 자동생성)" />
                    </div>
                </div>

                <div className={adminStyles.memberFields}>
                    <div>
                        <label htmlFor="add-member-youtubeChannelId" className="block text-xs font-bold text-[var(--control-text)] mb-1">YouTube 채널 ID/Link</label>
                        <input id="add-member-youtubeChannelId" name="youtubeChannelId" value={formData.youtubeChannelId || ''} onChange={handleChange} placeholder="Channel ID or URL" />
                    </div>
                    <div>
                        <label htmlFor="add-member-youtubeReplayUrl" className="block text-xs font-bold text-[var(--control-text)] mb-1">다시보기 채널 URL</label>
                        <input id="add-member-youtubeReplayUrl" name="youtubeReplayUrl" value={formData.youtubeReplayUrl || ''} onChange={handleChange} placeholder="https://youtube.com/..." />
                    </div>
                </div>

                <div className={adminStyles.memberFields}>
                    <div>
                        <label htmlFor="add-member-defaultTime" className="block text-xs font-bold text-[var(--control-text)] mb-1">기본 방송 시작 시간</label>
                        <input id="add-member-defaultTime"
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
                            placeholder="ex: 19:00"
                        />
                    </div>
                    <div>
                        <label htmlFor="add-member-sortOrder" className="block text-xs font-bold text-[var(--control-text)] mb-1">정렬 순서 (숫자)</label>
                        <input id="add-member-sortOrder" type="number" name="sortOrder" value={formData.sortOrder} onChange={handleChange} placeholder="ex: 99" />
                    </div>
                </div>

                <div className={adminStyles.fieldGroup}>
                    <label className="block text-xs font-bold text-[var(--control-text)] mb-3">정기 휴방 요일 선택</label>
                    <div className={adminStyles.dayButtons}>
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
                                aria-pressed={!!formData.regularHoliday?.includes(day)}
                                className={`${controls.button} ${adminStyles.dayButton}`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={adminStyles.fieldGroup}>
                    <label className="block text-xs font-bold text-[var(--control-text)] mb-3">스케줄 셀 색상 설정</label>
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] text-[var(--control-text)] uppercase font-bold">배경색</span>
                            <div className="flex gap-2 items-center">
                                <input type="color" name="colorBg" value={formData.colorBg} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer p-0 border-none bg-transparent" />
                                <input type="text" name="colorBg" value={formData.colorBg} onChange={handleChange} className="w-16 p-1 text-[10px] border rounded font-mono text-center uppercase" maxLength={7} />
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] text-[var(--control-text)] uppercase font-bold">테두리색</span>
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
                    className={`${controls.button} ${adminStyles.primary}`}
                >
                    {isSubmitting ? '추가 중...' : '멤버 추가하기'}
                </button>
            </form>
        </BaseModal>
    );
}
