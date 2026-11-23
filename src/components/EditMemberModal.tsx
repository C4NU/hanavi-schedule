"use client";

import { useState, useEffect } from 'react';
import { CharacterSchedule } from '@/types/schedule';
import { toast } from 'sonner';
import BaseModal from './BaseModal';
import controls from './ScheduleHeader.module.css';
import adminStyles from './admin/AdminSchedule.module.css';

interface EditMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (character: CharacterSchedule) => Promise<void>;
    character: CharacterSchedule | null;
}

export default function EditMemberModal({ isOpen, onClose, onUpdate, character }: EditMemberModalProps) {
    const [formData, setFormData] = useState<any>({
        id: '',
        name: '',
        avatarUrl: '',
        chzzkUrl: '',
        cimeUrl: '',
        youtubeUrl: '',
        youtubeChannelId: '',
        youtubeReplayUrl: '',
        twitterUrl: '',
        regularHoliday: '',
        defaultTime: '',
        sortOrder: '',
        colorBg: '#ffffff',
        colorBorder: '#ffb6c1',
        status: 'active',
        graduationDate: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingProfile, setIsFetchingProfile] = useState(false);

    useEffect(() => {
        if (character) {
            setFormData({
                ...character,
                sortOrder: character.sortOrder?.toString() || '',
                regularHoliday: character.regularHoliday || '',
                status: character.status || 'active',
                graduationDate: character.graduationDate || ''
            });
        }
    }, [character, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!character) return;
        
        setIsSubmitting(true);
        try {
            await onUpdate({
                ...formData,
                sortOrder: formData.sortOrder ? parseInt(formData.sortOrder) : undefined,
                schedule: character.schedule // Preserve schedule
            });
            onClose();
        } catch (error) {
            console.error('Failed to update member:', error);
            toast.error('멤버 정보 수정에 실패했습니다.');
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
            title="멤버 정보 수정"
            variant="sheet"
            maxWidth="600px"
        >
            <form onSubmit={handleSubmit} className={adminStyles.sheetBody}>
                
                <div className={adminStyles.fieldGroup}>
                    <label className="block text-xs font-bold text-[var(--schedule-display-ink)] mb-2">멤버 상태 관리</label>
                    <div className={adminStyles.memberFields}>
                        <div>
                            <label htmlFor="edit-member-status" className="block text-[10px] font-bold text-[var(--control-text)] mb-1">상태</label>
                            <select
                                id="edit-member-status"
                                name="status" 
                                value={formData.status} 
                                onChange={handleChange}
                            >
                                <option value="active">활동 중 (Active)</option>
                                <option value="graduated">졸업 (Graduated)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="edit-member-graduationDate" className="block text-[10px] font-bold text-[var(--control-text)] mb-1">졸업 예정일/졸업일</label>
                            <input
                                id="edit-member-graduationDate"
                                type="date" 
                                name="graduationDate" 
                                value={formData.graduationDate} 
                                onChange={handleChange}
                                disabled={formData.status !== 'graduated'}
                            />
                        </div>
                    </div>
                </div>

                <div className={adminStyles.memberFields}>
                    <div>
                        <label htmlFor="edit-member-id" className="block text-xs font-bold text-[var(--control-text)] mb-1">ID (수정 불가)</label>
                        <input id="edit-member-id" disabled value={formData.id} />
                    </div>
                    <div>
                        <label htmlFor="edit-member-name" className="block text-xs font-bold text-[var(--control-text)] mb-1">이름 (표시용)</label>
                        <input id="edit-member-name" required name="name" value={formData.name} onChange={handleChange} />
                    </div>
                </div>

                <div>
                    <label htmlFor="edit-member-avatarUrl" className="block text-xs font-bold text-[var(--control-text)] mb-1">프로필 이미지 URL</label>
                    <div className={adminStyles.inlineField}>
                        <input id="edit-member-avatarUrl" required name="avatarUrl" value={formData.avatarUrl || ''} onChange={handleChange} />
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
                        <label htmlFor="edit-member-cimeUrl" className="block text-xs font-bold text-[var(--control-text)] mb-1">씨미(Cime) 채널 URL (직통)</label>
                        <input id="edit-member-cimeUrl" name="cimeUrl" value={formData.cimeUrl || ''} onChange={handleChange} placeholder="https://cime.live/..." />
                    </div>
                    <div>
                        <label htmlFor="edit-member-chzzkUrl" className="block text-xs font-bold text-[var(--control-text)] mb-1">치지직/씨미 ID (폴백)</label>
                        <input id="edit-member-chzzkUrl" name="chzzkUrl" value={formData.chzzkUrl || ''} onChange={handleChange} placeholder="ID만 입력" />
                    </div>
                </div>

                <div className={adminStyles.memberFields}>
                    <div>
                        <label htmlFor="edit-member-youtubeUrl" className="block text-xs font-bold text-[var(--control-text)] mb-1">YouTube 채널 링크 (URL)</label>
                        <input id="edit-member-youtubeUrl" name="youtubeUrl" value={formData.youtubeUrl || ''} onChange={handleChange} placeholder="https://youtube.com/@..." />
                    </div>
                    <div>
                        <label htmlFor="edit-member-youtubeReplayUrl" className="block text-xs font-bold text-[var(--control-text)] mb-1">YouTube 다시보기 링크 (URL)</label>
                        <input id="edit-member-youtubeReplayUrl" name="youtubeReplayUrl" value={formData.youtubeReplayUrl || ''} onChange={handleChange} placeholder="https://youtube.com/..." />
                    </div>
                </div>

                <div>
                    <label htmlFor="edit-member-youtubeChannelId" className="block text-xs font-bold text-[var(--control-text)] mb-1">자동 연동용 YouTube 채널 ID</label>
                    <input id="edit-member-youtubeChannelId" name="youtubeChannelId" value={formData.youtubeChannelId || ''} onChange={handleChange} placeholder="UC..." />
                </div>

                <div>
                    <label htmlFor="edit-member-twitterUrl" className="block text-xs font-bold text-[var(--control-text)] mb-1">Twitter/X 프로필 링크 (URL)</label>
                    <input id="edit-member-twitterUrl" name="twitterUrl" value={formData.twitterUrl || ''} onChange={handleChange} placeholder="https://x.com/username" />
                </div>

                <div className={adminStyles.memberFields}>
                    <div>
                        <label htmlFor="edit-member-defaultTime" className="block text-xs font-bold text-[var(--control-text)] mb-1">기본 방송 시작 시간</label>
                        <input id="edit-member-defaultTime" name="defaultTime" value={formData.defaultTime || ''} onChange={handleChange} placeholder="ex: 19:00" />
                    </div>
                    <div>
                        <label htmlFor="edit-member-sortOrder" className="block text-xs font-bold text-[var(--control-text)] mb-1">정렬 순서</label>
                        <input id="edit-member-sortOrder" type="number" name="sortOrder" value={formData.sortOrder || ''} onChange={handleChange} />
                    </div>
                </div>

                <div className={adminStyles.fieldGroup}>
                    <label className="block text-xs font-bold text-[var(--control-text)] mb-3">스케줄 셀 색상 설정</label>
                    <div className="flex gap-4 items-center">
                        <input type="color" name="colorBg" value={formData.colorBg || '#ffffff'} onChange={handleChange} className="h-10 w-10 rounded cursor-pointer p-0 border-none bg-transparent" />
                        <input type="color" name="colorBorder" value={formData.colorBorder || '#ffb6c1'} onChange={handleChange} className="h-10 w-10 rounded cursor-pointer p-0 border-none bg-transparent" />
                        <div 
                            className="flex-1 h-12 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm border"
                            style={{ backgroundColor: formData.colorBg, borderColor: formData.colorBorder, color: formData.colorBorder }}
                        >
                            {formData.name}
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`${controls.button} ${adminStyles.primary}`}
                >
                    {isSubmitting ? '수정 중...' : '정보 수정 완료'}
                </button>
            </form>
        </BaseModal>
    );
}
