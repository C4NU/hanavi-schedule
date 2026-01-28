import { useState } from 'react';
import { CharacterSchedule } from '@/types/schedule';

interface RemoveMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    characters: CharacterSchedule[];
    onRemove: (id: string) => Promise<void>;
}

export default function RemoveMemberModal({ isOpen, onClose, characters, onRemove }: RemoveMemberModalProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const handleDelete = async () => {
        if (!selectedId) return;

        // Final Confirmation
        if (window.confirm('정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 해당 멤버의 모든 스케줄 데이터가 삭제됩니다.')) {
            await onRemove(selectedId);
            setIsConfirming(false);
            setSelectedId(null);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-scale-in">

                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-red-500">🗑 멤버 제거</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <div className="text-sm text-gray-500 mb-4">제거할 멤버를 선택해주세요.</div>

                    <div className="space-y-2">
                        {characters.map(char => (
                            <button
                                key={char.id}
                                onClick={() => setSelectedId(char.id)}
                                className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all
                                    ${selectedId === char.id
                                        ? 'border-red-500 bg-red-50 ring-2 ring-red-100'
                                        : 'border-gray-100 hover:bg-gray-50'}
                                `}
                            >
                                <div className="relative w-10 h-10">
                                    <img
                                        src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`}
                                        alt={char.name}
                                        className="w-full h-10 rounded-full object-cover bg-gray-200"
                                    />
                                    {selectedId === char.id && (
                                        <div className="absolute inset-0 bg-red-500/20 rounded-full flex items-center justify-center">
                                            <span className="text-white font-bold text-xs">V</span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-bold text-gray-800">{char.name}</div>
                                    <div className="text-xs text-gray-400 font-mono">{char.id}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={!selectedId}
                        className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        삭제하기
                    </button>
                </div>

            </div>
        </div>
    );
}
