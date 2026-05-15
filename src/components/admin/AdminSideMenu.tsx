"use client";

import React from 'react';
import { WeeklySchedule, CharacterSchedule } from '@/types/schedule';

type Character = CharacterSchedule;

interface AdminSideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  role: string;
  isSaving: boolean;
  filterMemberId: string | null;
  characters: Character[];
  editSchedule: WeeklySchedule | null;
  loggedInChar: Character | undefined;
  onSave: () => void;
  onOpenAdminInfo: () => void;
  onOpenAutoLink: () => void;
  onOpenCimeSync: () => void;
  onOpenRegularHoliday: () => void;
  onOpenAddMember: () => void;
  onOpenRemoveMember: () => void;
  onFilterMember: (id: string | null) => void;
  onEditMember: (char: Character) => void;
  onOpenPassword: () => void;
  onOpenEmail: () => void;
  onLogout: () => void;
}

export default function AdminSideMenu({
  isOpen,
  onClose,
  role,
  isSaving,
  filterMemberId,
  characters,
  editSchedule,
  loggedInChar,
  onSave,
  onOpenAdminInfo,
  onOpenAutoLink,
  onOpenCimeSync,
  onOpenRegularHoliday,
  onOpenAddMember,
  onOpenRemoveMember,
  onFilterMember,
  onEditMember,
  onOpenPassword,
  onOpenEmail,
  onLogout,
}: AdminSideMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-[90] backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-[300px] bg-white shadow-2xl z-[100] flex flex-col animate-slide-left border-l border-gray-100">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="font-bold text-gray-800 text-lg">관리 메뉴</div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 font-bold transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <button
            onClick={() => { onSave(); onClose(); }}
            disabled={isSaving}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
          >
            <span className="group-hover:scale-110 transition-transform">💾</span>
            <span>{isSaving ? '저장 중...' : '변경사항 저장'}</span>
          </button>
          <button
            onClick={() => { onOpenAdminInfo(); onClose(); }}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
          >
            <span className="group-hover:scale-110 transition-transform">ℹ️</span>
            <span>관리자 가이드</span>
          </button>
          <button
            onClick={() => { onOpenAutoLink(); onClose(); }}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
          >
            <span className="group-hover:scale-110 transition-transform">▶️</span>
            <span>유튜브 자동 연결</span>
          </button>
          <button
            onClick={() => { onOpenCimeSync(); onClose(); }}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
          >
            <span className="group-hover:scale-110 transition-transform">📺</span>
            <span>씨미 다시보기 연결</span>
          </button>
          <button
            onClick={() => { onOpenRegularHoliday(); onClose(); }}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
          >
            <span className="group-hover:scale-110 transition-transform">📅</span>
            <span>정기 휴방 관리</span>
          </button>

          <div className="h-px bg-gray-100 my-4 mx-2" />

          <button
            onClick={() => { onOpenAddMember(); onClose(); }}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
          >
            <span className="group-hover:scale-110 transition-transform">✨</span>
            <span>멤버 추가</span>
          </button>
          <button
            onClick={() => { onOpenRemoveMember(); onClose(); }}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 flex items-center gap-3 font-bold transition-colors group"
          >
            <span className="group-hover:scale-110 transition-transform">🗑</span>
            <span>멤버 제거</span>
          </button>

          <div className="h-px bg-gray-100 my-4 mx-2" />

          {role === 'admin' ? (
            <div className="space-y-1">
              <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                멤버 필터
              </div>
              <button
                onClick={() => { onFilterMember(null); onClose(); }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-colors font-bold ${
                  !filterMemberId ? 'bg-pink-50 text-pink-600' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                전체 보기
              </button>
              {characters.map(char => (
                <div key={char.id} className="flex items-center gap-1 group">
                  <button
                    onClick={() => { onFilterMember(char.id); onClose(); }}
                    className={`flex-1 text-left px-4 py-3 rounded-xl transition-colors font-bold ${
                      filterMemberId === char.id ? 'bg-pink-50 text-pink-600' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {char.name}
                  </button>
                  <button
                    onClick={() => { onEditMember(char); onClose(); }}
                    className="p-3 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    ✏️
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => {
                if (loggedInChar) onEditMember(loggedInChar);
                onClose();
              }}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
            >
              <span className="group-hover:scale-110 transition-transform">✏️</span>
              <span>내 정보 수정</span>
            </button>
          )}

          <div className="h-px bg-gray-100 my-4 mx-2" />

          <button
            onClick={() => { onOpenPassword(); onClose(); }}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-600 transition-colors group"
          >
            <span className="group-hover:scale-110 transition-transform">🔒</span>
            <span>비밀번호 변경</span>
          </button>
          {role === 'admin' && (
            <button
              onClick={() => { onOpenEmail(); onClose(); }}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-600 transition-colors group"
            >
              <span className="group-hover:scale-110 transition-transform">📧</span>
              <span>문의 이메일 변경</span>
            </button>
          )}

          <div className="h-px bg-gray-100 my-4 mx-2" />

          <button
            onClick={onLogout}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 flex items-center gap-3 font-bold transition-colors group"
          >
            <span className="group-hover:rotate-12 transition-transform">🚪</span>
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </>
  );
}
