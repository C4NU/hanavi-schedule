import { useState, useEffect } from 'react';
import { CharacterSchedule } from '@/types/schedule';

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
            alert('멤버 정보 수정에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !character) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-scale-in">

                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">👤 멤버 정보 수정</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                    
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-2">
                        <label className="block text-xs font-bold text-blue-500 mb-2">멤버 상태 관리</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-blue-400 mb-1">상태</label>
                                <select 
                                    name="status" 
                                    value={formData.status} 
                                    onChange={handleChange}
                                    className="w-full p-2.5 bg-white rounded-lg border border-blue-200 focus:border-blue-400 outline-none text-sm font-bold text-blue-700"
                                >
                                    <option value="active">활동 중 (Active)</option>
                                    <option value="graduated">졸업 (Graduated)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-blue-400 mb-1">졸업 예정일/졸업일</label>
                                <input 
                                    type="date" 
                                    name="graduationDate" 
                                    value={formData.graduationDate} 
                                    onChange={handleChange}
                                    disabled={formData.status !== 'graduated'}
                                    className={`w-full p-2.5 bg-white rounded-lg border border-blue-200 focus:border-blue-400 outline-none text-sm font-mono ${formData.status !== 'graduated' ? 'opacity-50 grayscale' : ''}`}
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-blue-400 mt-2 italic"> * 상태가 '졸업'이고 졸업일이 오늘보다 이전인 경우 스케줄표에서 자동으로 숨겨집니다.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">ID (수정 불가)</label>
                            <input disabled value={formData.id} className="w-full p-3 bg-gray-100 rounded-xl border border-gray-200 outline-none font-mono text-sm text-gray-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">이름 (표시용)</label>
                            <input required name="name" value={formData.name} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">프로필 이미지 URL</label>
                        <input required name="avatarUrl" value={formData.avatarUrl} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">씨미(Cime) 채널 URL (직통)</label>
                            <input name="cimeUrl" value={formData.cimeUrl || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="https://cime.live/..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">치지직/씨미 ID (폴백)</label>
                            <input name="chzzkUrl" value={formData.chzzkUrl || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="ID만 입력" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">메인 YouTube 채널 링크 (URL)</label>
                            <input name="youtubeUrl" value={formData.youtubeUrl || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="https://youtube.com/@..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">YouTube 다시보기 링크 (URL)</label>
                            <input name="youtubeReplayUrl" value={formData.youtubeReplayUrl || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="https://youtube.com/..." />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">자동 연동용 YouTube 채널 ID</label>
                        <input name="youtubeChannelId" value={formData.youtubeChannelId} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="UC..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">기본 방송 시작 시간</label>
                            <input name="defaultTime" value={formData.defaultTime} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" placeholder="ex: 19:00" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">정렬 순서</label>
                            <input type="number" name="sortOrder" value={formData.sortOrder} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-300 outline-none text-sm font-mono" />
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 mb-2">스케줄 셀 색상 설정</label>
                        <div className="flex gap-4 items-center">
                            <input type="color" name="colorBg" value={formData.colorBg} onChange={handleChange} className="h-10 w-10 rounded cursor-pointer" />
                            <input type="color" name="colorBorder" value={formData.colorBorder} onChange={handleChange} className="h-10 w-10 rounded cursor-pointer" />
                            <div 
                                className="flex-1 h-10 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm border"
                                style={{ backgroundColor: formData.colorBg, borderColor: formData.colorBorder, color: formData.colorBorder }}
                            >
                                {formData.name}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition-all shadow-lg disabled:opacity-50 mt-4"
                    >
                        {isSubmitting ? '수정 중...' : '정보 수정 완료'}
                    </button>

                </form>
            </div>
        </div>
    );
}
