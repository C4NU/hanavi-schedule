"use client";

import { useState, useEffect, useCallback } from 'react';
import { WeeklySchedule, ScheduleItem, CharacterSchedule } from '@/types/schedule';
import { MOCK_SCHEDULE } from '@/data/mockSchedule';
import ScheduleGrid from '@/components/ScheduleGrid';
import AdminInfoModal from '@/components/AdminInfoModal';
import RegularHolidayModal from '@/components/RegularHolidayModal';
import AddMemberModal from '@/components/AddMemberModal';
import { addCharacter, deleteCharacter, updateCharacter } from '@/utils/supabase';
import EditMemberModal from '@/components/EditMemberModal';
import RemoveMemberModal from '@/components/RemoveMemberModal';
import ScheduleSkeleton from '@/components/ScheduleSkeleton';
import { useSchedule } from '@/hooks/useSchedule';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useNotification } from '@/hooks/useNotification';
import { useAutoLink } from '@/hooks/useAutoLink';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import AdminSideMenu from '@/components/admin/AdminSideMenu';
import NotificationModal from '@/components/admin/NotificationModal';
import { toast } from 'sonner';
import { getMonday, formatWeekRange } from '@/utils/date';
import { updateScheduleItem } from '@/utils/scheduleEditor';

// Use CharacterSchedule from types — local alias for brevity
type Character = CharacterSchedule;

export default function AdminPage() {
  const {
    isAuthenticated,
    role,
    session,
    id,
    password,
    setId,
    setPassword,
    handleLogin,
    handleLogout,
  } = useAdminAuth();

  const {
    notifyStatus,
    isNewRelease,
    timeLeft,
    isModalVisible,
    setIsModalVisible,
    setIsNewRelease,
    setNotifyStatus,
    setTimeLeft,
    cancelNotification,
  } = useNotification();

  const { autoLinkStatus, autoLinkLogs, runAutoLink } = useAutoLink(); // autoLinkResult unused in UI (shown in logs)

  const [editSchedule, setEditSchedule] = useState<WeeklySchedule | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(getMonday(new Date()));
  const weekRangeString = formatWeekRange(currentDate);
  const { schedule, isLoading: isScheduleLoading, isUsingRealData, mutate } = useSchedule(weekRangeString);

  const [isSaving, setIsSaving] = useState(false);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  // Modal visibility states
  const [isAdminInfoOpen, setIsAdminInfoOpen] = useState(false);
  const [isRegularHolidayModalOpen, setIsRegularHolidayModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isAutoLinkModalOpen, setIsAutoLinkModalOpen] = useState(false);
  const [isAutoLinkInfoOpen, setIsAutoLinkInfoOpen] = useState(false);
  const [isCimeSyncModalOpen, setIsCimeSyncModalOpen] = useState(false);

  // Password change state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Email change state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Cime sync state
  const [isCimeSyncing, setIsCimeSyncing] = useState(false);
  const [cimeSyncResult, setCimeSyncResult] = useState<string | null>(null);

  // Synchronize editSchedule with SWR data
  useEffect(() => {
    if (schedule) {
      setEditSchedule(prev => {
        const isNewWeek = !prev || prev.weekRange !== schedule.weekRange;
        const charIdsChanged =
          prev &&
          JSON.stringify(prev.characters.map((c: Character) => c.id)) !==
            JSON.stringify(schedule.characters.map((c: Character) => c.id));
        const forceUpdate = isNewWeek || (isUsingRealData && !(prev as WeeklySchedule & { isUsingRealData?: boolean })?.isUsingRealData) || charIdsChanged;

        if (forceUpdate) {
          return { ...schedule, isUsingRealData } as WeeklySchedule & { isUsingRealData?: boolean };
        }
        return prev;
      });
    } else if (isScheduleLoading) {
      setEditSchedule(null);
    }
  }, [schedule, isScheduleLoading, isUsingRealData]);

  // Fetch global settings (email)
  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.email) setInquiryEmail(data.email);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const navigateWeek = (direction: -1 | 1) => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + direction * 7);
      return next;
    });
  };

  const updateDay = useCallback((charId: string, day: string, field: keyof ScheduleItem, value: string) => {
    setEditSchedule(prev => {
      if (!prev) return null;
      return updateScheduleItem(prev, charId, day, field, value);
    });
  }, []);

  const updateYoutubeId = (charId: string, newId: string) => {
    if (!editSchedule) return;
    setEditSchedule(prev => {
      if (!prev) return null;
      const newSchedule = { ...prev };
      const char = newSchedule.characters.find((c: Character) => c.id === charId) as Character | undefined;
      if (char) char.youtubeChannelId = newId.trim();
      return newSchedule;
    });
  };

  const handleTimeBlur = (charId: string, day: string, value: string) => {
    const trimmed = value.trim();
    if (/^\d{1,2}$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (num >= 0 && num <= 24) {
        updateDay(charId, day, 'time', `${num.toString().padStart(2, '0')}:00`);
      }
    }
  };

  const handleSave = async () => {
    if (!editSchedule) return;
    setIsSaving(true);
    if (notifyStatus === 'pending') cancelNotification();

    if (!session) {
      toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
      handleLogout();
      setIsSaving(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(editSchedule),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        if (notifyStatus === 'idle') setIsNewRelease(!isUsingRealData);
        localStorage.setItem('hanavi_last_schedule', JSON.stringify(editSchedule));
        setNotifyStatus('pending');
        setTimeLeft(60);
        setIsModalVisible(true);
      } else {
        const errText = await res.text();
        if (res.status === 401) {
          toast.error('인증 실패: 다시 로그인해주세요.');
          sessionStorage.clear();
          handleLogout();
        } else {
          toast.error(`저장 실패: 서버 오류 (${res.status}) ${errText}`);
        }
      }
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (isAbort) {
        toast.error('저장 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.');
      } else {
        toast.error('에러 발생: ' + err);
      }
    } finally {
      setIsSaving(false);
      clearTimeout(timeoutId);
      mutate();
    }
  };


  const handleRegularHolidayUpdate = (updates: { id: string; holidays: string }[]) => {
    if (!editSchedule) return;
    setEditSchedule(prev => {
      if (!prev) return null;
      const newSchedule = { ...prev };
      updates.forEach(({ id, holidays }) => {
        const char = newSchedule.characters.find((c: Character) => c.id === id) as Character | undefined;
        if (char) char.regularHoliday = holidays;
      });
      return newSchedule;
    });
    setNotifyStatus('idle');
    toast.info('정기 휴방 설정이 적용되었습니다. 우측 상단 "변경사항 저장" 버튼을 눌러 확정하세요.');
  };

  const handleAddMember = async (character: Omit<CharacterSchedule, 'schedule'>) => {
    const result = await addCharacter(character);
    if (result.success) {
      toast.success('멤버가 추가되었습니다.');
      mutate();
    } else {
      toast.error('멤버 추가 실패: ' + (result.error?.message || result.error));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const result = await deleteCharacter(memberId);
    if (result.success) {
      toast.success('멤버가 삭제되었습니다.');
      mutate();
    } else {
      toast.error('멤버 삭제 실패: ' + (result.error?.message || result.error));
    }
  };

  const handleUpdateMember = async (character: Character) => {
    const result = await updateCharacter(character);
    if (result.success) {
      toast.success('멤버 정보가 수정되었습니다. 페이지를 새로고침합니다.');
      window.location.reload();
    } else {
      toast.error('멤버 정보 수정 실패: ' + (result.error?.message || result.error));
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) return toast.error('비밀번호를 입력해주세요.');
    if (newPassword !== confirmPassword) return toast.error('비밀번호가 일치하지 않습니다.');
    if (newPassword.length < 6) return toast.error('비밀번호는 6자 이상이어야 합니다.');

    setPasswordStatus('loading');
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordStatus('success');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordStatus('idle');
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error('비밀번호 변경 실패: ' + message);
      setPasswordStatus('error');
    }
  };

  const handleEmailUpdate = async () => {
    if (!inquiryEmail) return toast.error('이메일을 입력해주세요.');

    setEmailStatus('loading');
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeSession?.access_token}`
        },
        body: JSON.stringify({ email: inquiryEmail })
      });

      if (res.ok) {
        setEmailStatus('success');
        setTimeout(() => {
          setIsEmailModalOpen(false);
          setEmailStatus('idle');
        }, 1500);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update email');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setEmailStatus('error');
      toast.error('이메일 변경 실패: ' + message);
    }
  };

  const handleCimeSync = async () => {
    setIsCimeSyncing(true);
    setCimeSyncResult(null);
    try {
      const res = await fetch('/api/cron/update-cime-replays', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setCimeSyncResult(`✅ 동기화 성공: ${data.updated}개 처리됨`);
        toast.success('씨미 다시보기 동기화가 완료되었습니다.');
        mutate();
      } else {
        setCimeSyncResult(`❌ 오류: ${data.error || '알 수 없는 오류'}`);
        toast.error('동기화 중 오류가 발생했습니다.');
      }
    } catch {
      setCimeSyncResult('❌ 네트워크 오류가 발생했습니다.');
      toast.error('네트워크 오류가 발생했습니다.');
    } finally {
      setIsCimeSyncing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <AdminLoginForm
        id={id}
        password={password}
        onIdChange={setId}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  const loggedInChar = editSchedule?.characters.find((c: Character) => c.id === role) as Character | undefined;
  const characters = (editSchedule?.characters ?? []) as Character[];

  const effectiveSchedule: WeeklySchedule = editSchedule ?? {
    ...MOCK_SCHEDULE,
    weekRange: formatWeekRange(currentDate),
    characters: MOCK_SCHEDULE.characters.map((c: Character) => ({
      ...c,
      schedule: Object.keys(c.schedule).reduce((acc: Record<string, ScheduleItem>, day) => ({
        ...acc,
        [day]: { time: '', content: '', type: 'stream' }
      }), {})
    }))
  };

  let gridDisplayData: WeeklySchedule = effectiveSchedule;

  if (role !== 'admin') {
    gridDisplayData = {
      ...gridDisplayData,
      characters: gridDisplayData.characters.filter((c: Character) => c.id === role)
    };
  } else if (filterMemberId) {
    gridDisplayData = {
      ...gridDisplayData,
      characters: gridDisplayData.characters.filter((c: Character) => c.id === filterMemberId)
    };
  }

  if (!editSchedule) {
    return (
      <div className="h-full overflow-hidden flex flex-col items-center select-none w-full">
        <ScheduleSkeleton />
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col items-center select-none">
      {/* Notification Modal */}
      <NotificationModal
        notifyStatus={notifyStatus}
        isModalVisible={isModalVisible}
        isNewRelease={isNewRelease}
        timeLeft={timeLeft}
        onClose={() => setIsModalVisible(false)}
        onCancel={cancelNotification}
        onSendNow={() => setTimeLeft(0)}
      />

      {/* Main Layout */}
      <div className="w-full min-h-0 flex-1 overflow-hidden main-layout">
        {editSchedule ? (
          <ScheduleGrid
            key={filterMemberId || 'all'}
            data={gridDisplayData}
            isEditable={true}
            onCellUpdate={(charId, day, field, value) => updateDay(charId, day, field as keyof ScheduleItem, value)}
            onCellBlur={(charId, day, field, value) => {
              if (field === 'time') handleTimeBlur(charId, day, value);
            }}
            onMemoAdded={() => mutate()}
            onPrevWeek={() => navigateWeek(-1)}
            onNextWeek={() => navigateWeek(1)}
            dateSelector={
              <div className="relative">
                <button
                  onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                  className="text-lg md:text-xl font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 px-4 py-1 rounded-full transition-colors flex items-center gap-2"
                >
                  {formatWeekRange(currentDate)}
                  <span className="text-xs text-gray-500">▼</span>
                </button>
                {isDateDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[150]" onClick={() => setIsDateDropdownOpen(false)} />
                    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[151] max-h-60 overflow-y-auto py-1">
                      {Array.from({ length: 9 }).map((_, i) => {
                        const offset = i - 4;
                        const d = new Date(currentDate);
                        d.setDate(d.getDate() + offset * 7);
                        const rangeStr = formatWeekRange(d);
                        const isCurrent = offset === 0;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setCurrentDate(d);
                              setIsDateDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-pink-50 transition-colors flex justify-between items-center ${
                              isCurrent ? 'bg-pink-100 text-pink-600' : 'text-gray-700'
                            }`}
                          >
                            <span>{rangeStr}</span>
                            {isCurrent && <span>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            }
            headerControls={
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 mr-2">
                  {loggedInChar ? (
                    <img
                      src={`/api/proxy/image?url=${encodeURIComponent(loggedInChar.avatarUrl)}`}
                      alt={loggedInChar.name}
                      className="w-8 h-8 rounded-full bg-white object-cover border border-gray-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                      A
                    </div>
                  )}
                  <span className="font-bold text-gray-700">{loggedInChar ? loggedInChar.name : '관리자'}</span>
                </div>
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700 bg-white shadow-sm border border-gray-100"
                >
                  ☰
                </button>
              </div>
            }
          />
        ) : (
          <div className="flex justify-center items-center h-[500px] text-gray-400">
            <div className="w-[800px] h-[400px] bg-gray-50 rounded-xl animate-pulse" />
          </div>
        )}
      </div>

      {/* Side Menu */}
      <AdminSideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        role={role}
        isSaving={isSaving}
        filterMemberId={filterMemberId}
        characters={characters}
        editSchedule={editSchedule}
        loggedInChar={loggedInChar}
        onSave={handleSave}
        onOpenAdminInfo={() => setIsAdminInfoOpen(true)}
        onOpenAutoLink={() => setIsAutoLinkModalOpen(true)}
        onOpenCimeSync={() => setIsCimeSyncModalOpen(true)}
        onOpenRegularHoliday={() => setIsRegularHolidayModalOpen(true)}
        onOpenAddMember={() => setIsAddMemberModalOpen(true)}
        onOpenRemoveMember={() => setIsRemoveMemberModalOpen(true)}
        onFilterMember={setFilterMemberId}
        onEditMember={(char) => { setEditingCharacter(char); setIsEditMemberModalOpen(true); }}
        onOpenPassword={() => setIsPasswordModalOpen(true)}
        onOpenEmail={() => setIsEmailModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Mobile FAB */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="md:hidden fixed bottom-5 right-5 z-[101] w-[50px] h-[50px] flex items-center justify-center bg-white text-[#ffb6c1] rounded-full shadow-lg border-2 border-[#ffb6c1] font-bold text-xl transition-transform active:scale-95"
      >
        ☰
      </button>

      {/* Modals */}
      <AdminInfoModal isOpen={isAdminInfoOpen} onClose={() => setIsAdminInfoOpen(false)} />
      <RegularHolidayModal
        isOpen={isRegularHolidayModalOpen}
        onClose={() => setIsRegularHolidayModalOpen(false)}
        characters={editSchedule?.characters || []}
        onApply={handleRegularHolidayUpdate}
      />
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onAdd={handleAddMember}
      />
      <RemoveMemberModal
        isOpen={isRemoveMemberModalOpen}
        onClose={() => setIsRemoveMemberModalOpen(false)}
        characters={editSchedule?.characters || []}
        onRemove={handleRemoveMember}
      />
      <EditMemberModal
        isOpen={isEditMemberModalOpen}
        onClose={() => { setIsEditMemberModalOpen(false); setEditingCharacter(null); }}
        character={editingCharacter}
        onUpdate={handleUpdateMember}
      />

      {/* Auto Link Modal */}
      {isAutoLinkModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-scale-in relative">
            {/* Help Overlay */}
            {isAutoLinkInfoOpen && (
              <div className="absolute inset-0 z-[210] bg-white/95 backdrop-blur-sm flex items-center justify-center p-8 animate-fade-in">
                <div className="bg-white border-2 border-blue-100 shadow-2xl rounded-2xl p-6 max-w-lg w-full">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h4 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                      <span>📘</span> 자동 연결 필터링 설명서
                    </h4>
                    <button onClick={() => setIsAutoLinkInfoOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                  </div>
                  <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                    <div>
                      <h5 className="font-bold text-gray-900 mb-1">🔍 작동 원리</h5>
                      <p>불러온 유튜브 영상의 <strong>제목</strong>을 분석하여 날짜를 찾고, 해당 날짜에 맞는 스케줄 칸에 영상을 자동으로 연결합니다.</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <h5 className="font-bold text-gray-900 mb-2">📌 날짜 인식 기준 (필터 구조)</h5>
                      <p className="mb-2">다음과 같은 숫자 패턴을 날짜로 인식합니다:</p>
                      <div className="font-mono bg-white p-2 rounded border border-gray-200 text-xs mb-3 space-y-1">
                        <div className="flex justify-between"><span>&quot;251010&quot;</span><span>→ 2025년 10월 10일</span></div>
                        <div className="flex justify-between text-gray-500"><span>&quot;24.12.25&quot;</span><span>→ 2024년 12월 25일</span></div>
                        <div className="flex justify-between text-gray-500"><span>&quot;24-01-01&quot;</span><span>→ 2024년 01월 01일</span></div>
                      </div>
                      <p className="text-xs text-gray-500">* 연도 앞의 &apos;20&apos;은 생략 가능합니다.<br />* 점(.)이나 하이픈(-)으로 구분되어 있어도 인식합니다.</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-xs text-yellow-800">
                      <strong>주의:</strong> 제목에 날짜가 없거나 인식이 불가능한 형식이면 연결되지 않습니다.
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-500 mt-2">
                      <strong>ℹ️ 기술적 안내:</strong><br />현재 유튜브 API 제한으로 인해 <strong>최근 50개의 영상</strong>까지만 자동으로 조회합니다.
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <button onClick={() => setIsAutoLinkInfoOpen(false)} className="px-6 py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors">
                      확인했습니다
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-b flex justify-between items-center bg-gray-50 flex-none">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span>▶️</span> 유튜브 다시보기 자동 연결
                  {autoLinkStatus === 'loading' && <span className="text-sm font-normal text-gray-500 animate-pulse">(작업 중...)</span>}
                </h3>
                <button onClick={() => setIsAutoLinkInfoOpen(true)} className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-200 transition-colors flex items-center gap-1">
                  <span>📘</span> 설명서
                </button>
              </div>
              <button onClick={() => setIsAutoLinkModalOpen(false)} disabled={autoLinkStatus === 'loading'} className="text-gray-400 hover:text-gray-600 disabled:opacity-50 text-2xl">&times;</button>
            </div>

            <div className="flex-1 flex min-h-0">
              {/* Left: Logs */}
              <div className="flex-1 flex flex-col border-r border-gray-100 min-w-0">
                <div className="p-3 bg-gray-100 border-b font-bold text-gray-600 flex justify-between items-center">
                  <span>📡 진행 로그</span>
                  {autoLinkStatus === 'idle' && autoLinkLogs.length === 0 && (
                    <button onClick={() => editSchedule && runAutoLink(editSchedule, currentDate, setEditSchedule)} className="px-3 py-1 bg-red-500 text-white rounded text-sm font-bold hover:bg-red-600">
                      시작하기
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-gray-900 text-green-400">
                  {autoLinkLogs.length === 0 && <div className="opacity-50 text-center mt-10">설정 확인 후 &apos;시작하기&apos;를 눌러주세요.</div>}
                  {autoLinkLogs.map((log, i) => <div key={i} className="mb-1 break-all">{log}</div>)}
                </div>
              </div>

              {/* Right: ID Inputs */}
              <div className="w-[400px] flex flex-col bg-white min-w-0">
                <div className="p-3 bg-gray-50 border-b font-bold text-gray-600 flex justify-between items-center">
                  <span>⚙️ 채널 ID 설정</span>
                  <button onClick={handleSave} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-100" title="전체 스케줄과 함께 저장됩니다">
                    ID 저장 (전체 저장)
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded mb-2">
                    * 입력한 ID는 &apos;저장&apos; 버튼을 누르면 DB에 반영됩니다.<br />
                    * ID가 등록된 멤버만 자동 연결이 수행됩니다.
                  </div>
                  {characters.map(char => (
                    <div key={char.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <img src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`} alt="" className="w-5 h-5 rounded-full bg-gray-100" />
                        <span className="text-sm font-bold text-gray-700">{char.name}</span>
                      </div>
                      <input
                        type="text"
                        value={char.youtubeChannelId || ''}
                        onChange={(e) => updateYoutubeId(char.id, e.target.value)}
                        placeholder="YouTube Channel ID 입력"
                        className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none focus:border-red-300 font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 flex-none">
              <button onClick={() => editSchedule && runAutoLink(editSchedule, currentDate, setEditSchedule)} disabled={autoLinkStatus === 'loading'} className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-bold transition-all shadow-sm">
                {autoLinkStatus === 'loading' ? '작업 중...' : '▶️ 자동 연결 시작'}
              </button>
              <button onClick={() => setIsAutoLinkModalOpen(false)} disabled={autoLinkStatus === 'loading'} className="px-5 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-bold transition-all">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border-2 border-pink-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><span>🔒</span> 비밀번호 변경</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">새 비밀번호</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all font-mono text-sm" placeholder="6자 이상 입력" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">비밀번호 확인</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all font-mono text-sm" placeholder="한 번 더 입력" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setIsPasswordModalOpen(false); setNewPassword(''); setConfirmPassword(''); }} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-colors">취소</button>
              <button onClick={handlePasswordChange} disabled={passwordStatus === 'loading'} className="flex-1 py-3 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                {passwordStatus === 'loading' ? '변경 중...' : '변경하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border-2 border-pink-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><span>📧</span> 문의 이메일 변경</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">이메일 주소</label>
                <input type="email" value={inquiryEmail} onChange={(e) => setInquiryEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all font-mono text-sm" placeholder="example@gmail.com" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setIsEmailModalOpen(false); setEmailStatus('idle'); }} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-colors">취소</button>
              <button onClick={handleEmailUpdate} disabled={emailStatus === 'loading'} className="flex-1 py-3 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                {emailStatus === 'loading' ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cime Sync Modal */}
      {isCimeSyncModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in relative p-6 border-2 border-indigo-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-600"><span>📺</span> 씨미 다시보기 수동 동기화</h3>
              <button onClick={() => setIsCimeSyncModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-xl text-sm text-indigo-700 border border-indigo-100">
                <p className="font-bold mb-1">🛠️ 기능 안내</p>
                <p>씨미(Ci.me) 공식 사이트에서 최근 다시보기 데이터를 읽어와 스케줄에 자동으로 링크를 연결합니다.</p>
              </div>
              <button onClick={handleCimeSync} disabled={isCimeSyncing} className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 ${isCimeSyncing ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 active:scale-95'}`}>
                {isCimeSyncing ? <><span className="animate-spin">🔄</span>동기화 중...</> : '지금 동기화 시작하기'}
              </button>
              {cimeSyncResult && (
                <div className={`p-4 rounded-xl text-sm font-medium border animate-fade-in ${cimeSyncResult.includes('✅') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                  {cimeSyncResult}
                </div>
              )}
            </div>
            <div className="mt-8 pt-4 border-t text-center">
              <button onClick={() => setIsCimeSyncModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition-colors">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
