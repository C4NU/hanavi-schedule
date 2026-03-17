import React from 'react';

interface PWAInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
}

const PWAInstructions: React.FC<PWAInstructionsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-4 animate-fade-in">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up bg-gradient-to-b from-white to-pink-50">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📱</span>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">홈 화면에 추가</h3>
                <p className="text-xs text-gray-500 font-medium">편하게 앱처럼 사용해 보세요!</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 py-2">
            <div className="flex items-start gap-4 p-3 bg-white/60 rounded-2xl border border-pink-100/50">
              <div className="w-8 h-8 flex-shrink-0 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center font-bold">1</div>
              <p className="text-sm text-gray-700 leading-relaxed pt-1">
                하단 바의 <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold">공유 버튼</span>(사각형에 위 화살표)을 눌러주세요.
              </p>
            </div>

            <div className="flex items-start gap-4 p-3 bg-white/60 rounded-2xl border border-pink-100/50">
              <div className="w-8 h-8 flex-shrink-0 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center font-bold">2</div>
              <p className="text-sm text-gray-700 leading-relaxed pt-1">
                메뉴를 아래로 내려 <span className="text-pink-600 font-bold">'홈 화면에 추가'</span>를 선택해 주세요.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full mt-6 py-4 bg-gradient-to-r from-pink-400 to-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-200 active:scale-[0.98] transition-all"
          >
            확인했어요
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstructions;
