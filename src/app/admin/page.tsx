"use client";

import { normalizeTimePart } from '@/utils/time';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WeeklySchedule, ScheduleItem, CharacterSchedule } from '@/types/schedule';
import ScheduleGrid from '@/components/ScheduleGrid';
import ScheduleWeekPicker from '@/components/ScheduleWeekPicker';
import { MenuIcon } from '@/components/MobileScheduleMenu';
import headerStyles from '@/components/ScheduleHeader.module.css';
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
import { useScheduleTheme } from '@/hooks/useScheduleTheme';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import BaseModal from '@/components/BaseModal';
import adminStyles from '@/components/admin/AdminSchedule.module.css';
import AdminSideMenu from '@/components/admin/AdminSideMenu';
import NotificationModal from '@/components/admin/NotificationModal';
import ReplayCandidateList from '@/components/admin/ReplayCandidateList';
import type { ReplayCandidate } from '@/types/replay';
import { toast } from 'sonner';
import { getMonday, formatWeekRange } from '@/utils/date';
import { addSchedulePart, CollaborationUpdate, updateCollaborationEvent, updateScheduleItem, updateSchedulePart } from '@/utils/scheduleEditor';
import { cellsToEvents } from '@/utils/events';
import { v4 as uuidv4 } from 'uuid';

// Use CharacterSchedule from types — local alias for brevity
type Character = CharacterSchedule;

export default function AdminPage() {
  const {
    isAuthenticated,
    isCheckingSession,
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
    setDeliveryKey,
    cancelNotification,
  } = useNotification();

  const { autoLinkStatus, autoLinkLogs, previewCandidates, runAutoLink } = useAutoLink(); // autoLinkResult unused in UI (shown in logs)

  const [editSchedule, setEditSchedule] = useState<WeeklySchedule | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(getMonday(new Date()));
  const weekRangeString = formatWeekRange(currentDate);
  const { schedule, isLoading: isScheduleLoading, isUsingRealData, isUsingMock, isError: scheduleError, mutate } = useSchedule(weekRangeString);

  // 공개 페이지와 같은 키를 공유 — 관리자 화면도 사용자 테마로 WYSIWYG 유지
  const { theme } = useScheduleTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  // Modal visibility states
  const [isAdminInfoOpen, setIsAdminInfoOpen] = useState(false);
  const [isRegularHolidayModalOpen, setIsRegularHolidayModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isAutoLinkModalOpen, setIsAutoLinkModalOpen] = useState(false);
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
  const [cimeCandidates, setCimeCandidates] = useState<ReplayCandidate[] | null>(null);
  const [replaySample, setReplaySample] = useState<'cime' | 'youtube' | null>(null);

  // 로컬 미저장 수정 여부 — true 동안에는 SWR 갱신이 드래프트를 덮지 않는다
  const editDirtyRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const pendingEventSaveRef = useRef<{ payload: string; id: string } | null>(null);

  // Synchronize editSchedule with SWR data
  useEffect(() => {
    if (schedule) {
      setEditSchedule(prev => {
        const isNewWeek = !prev || prev.weekRange !== schedule.weekRange;
        const charIdsChanged =
          prev &&
          JSON.stringify(prev.characters.map((c: Character) => c.id)) !==
            JSON.stringify(schedule.characters.map((c: Character) => c.id));
        // 아이템 레벨 변경도 감지 (셀 내용/시간 등) — 로컬 수정 중이 아닐 때만 채택
        const itemsChanged =
          prev &&
          JSON.stringify(prev.characters.map((c: Character) => c.schedule)) !==
            JSON.stringify(schedule.characters.map((c: Character) => c.schedule));
        const forceUpdate =
          isNewWeek ||
          (isUsingRealData && !(prev as WeeklySchedule & { isUsingRealData?: boolean })?.isUsingRealData) ||
          charIdsChanged ||
          (itemsChanged && !editDirtyRef.current);

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
    editDirtyRef.current = true;
    setEditSchedule(prev => {
      if (!prev) return null;
      return updateScheduleItem(prev, charId, day, field, value);
    });
  }, []);

  const updateCollaboration = useCallback((update: CollaborationUpdate) => {
    editDirtyRef.current = true;
    setEditSchedule(prev => (prev ? updateCollaborationEvent(prev, update) : null));
  }, []);

  const updatePart = useCallback((charId: string, day: string, partIndex: number, field: keyof ScheduleItem, value: string) => {
    editDirtyRef.current = true;
    setEditSchedule(prev => (prev ? updateSchedulePart(prev, charId, day, partIndex, field as 'time' | 'content' | 'type' | 'videoUrl' | 'alternateVideoUrl' | 'category', value) : null));
  }, []);

  const addPart = useCallback((charId: string, day: string) => {
    editDirtyRef.current = true;
    setEditSchedule(prev => (prev ? addSchedulePart(prev, charId, day) : null));
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
    const normalized = value.split('+').map(normalizeTimePart).join('+');
    if (normalized !== value) updateDay(charId, day, 'time', normalized);
  };

  const handleSave = async () => {
    if (!editSchedule || saveInFlightRef.current) return;
    if (isScheduleLoading) {
      toast.error('스케줄을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    if (isUsingMock) {
      toast.error('실제 스케줄을 불러오지 못해 저장할 수 없습니다. 새로고침 후 다시 시도해주세요.');
      return;
    }
    // A cached schedule is usable only when it carries a known canonical
    // graph. Older/partial caches must not be promoted into new event rows.
    if (!isUsingRealData && (!editSchedule.scheduleId || editSchedule.canonicalEventsStatus !== 'available')) {
      toast.error('캐시된 스케줄의 이벤트 상태를 확인할 수 없어 저장할 수 없습니다.');
      return;
    }
    const canonicalEventsUnavailable = Boolean(editSchedule.scheduleId) &&
      editSchedule.canonicalEventsStatus !== 'available';
    if (canonicalEventsUnavailable) {
      toast.error('이벤트 데이터 조회에 실패했습니다. 새로고침 후 다시 시도해주세요.');
      return;
    }

    if (!session) {
      toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
      handleLogout();
      return;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    if (notifyStatus === 'pending') cancelNotification();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let shouldRefreshSchedule = false;

    try {
      // 1) 스케줄 행 + 캐릭터 메타데이터 (아이템은 freeze — 이벤트로 저장)
      const scheduleRes = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(editSchedule),
        signal: controller.signal,
      });
      if (!scheduleRes.ok) {
        const errorText = await scheduleRes.text();
        console.error('Admin schedule save failed:', scheduleRes.status, errorText);
        if (scheduleRes.status === 401) {
          toast.error('인증 실패: 다시 로그인해주세요.');
          sessionStorage.clear();
          handleLogout();
        } else {
          toast.error(`저장 실패: 서버 오류 (${scheduleRes.status})`);
        }
        return;
      }
      const scheduleResult = await scheduleRes.json() as { scheduleId?: string };
      const scheduleId = scheduleResult.scheduleId || editSchedule.scheduleId;
      if (!scheduleId) {
        toast.error('저장 실패: 스케줄 ID를 찾을 수 없습니다.');
        return;
      }

      // 2) 이벤트 저장 (셀 → 이벤트 역파싱)
      const { events, deletedIds } = cellsToEvents(
        editSchedule.characters,
        editSchedule.events,
        editSchedule.scheduleId || editSchedule.weekRange,
      );
      const payload = { scheduleId, events, deletedIds };
      const serializedPayload = JSON.stringify(payload);
      const pendingSave = pendingEventSaveRef.current;
      // 같은 초안의 저장을 재시도할 때 발송 키를 유지한다.
      const saveId = pendingSave?.payload === serializedPayload ? pendingSave.id : uuidv4();
      pendingEventSaveRef.current = { payload: serializedPayload, id: saveId };
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ...payload, saveId }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const saved = await res.json() as { deliveryKey: string };
        setDeliveryKey(saved.deliveryKey);
        if (notifyStatus === 'idle') setIsNewRelease(!isUsingRealData);
        localStorage.setItem('hanavi_last_schedule', JSON.stringify(editSchedule));
        pendingEventSaveRef.current = null;
        editDirtyRef.current = false; // 저장 성공 — 서버 데이터와 동기화됨
        shouldRefreshSchedule = true;
        setNotifyStatus('pending');
        setTimeLeft(60);
        setIsModalVisible(true);
      } else {
        const errText = await res.text();
        console.error('Admin event save failed:', res.status, errText);
        if (res.status === 401) {
          toast.error('인증 실패: 다시 로그인해주세요.');
          sessionStorage.clear();
          handleLogout();
        } else {
          toast.error(`저장 실패: 서버 오류 (${res.status})`);
        }
      }
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (isAbort) {
        toast.error('저장 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.');
      } else {
        console.error('Admin schedule save request failed:', err);
        toast.error('저장 중 오류가 발생했습니다. 네트워크 상태를 확인해주세요.');
      }
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
      clearTimeout(timeoutId);
      // Keep the local draft intact after a partial two-step failure so the
      // administrator can retry event persistence without losing edits.
      if (shouldRefreshSchedule) mutate();
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

  const passwordBusy = passwordStatus === 'loading' || passwordStatus === 'success';
  const emailBusy = emailStatus === 'loading' || emailStatus === 'success';

  const closePasswordModal = () => {
    if (passwordBusy) return;
    setIsPasswordModalOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordStatus('idle');
  };

  const closeEmailModal = () => {
    if (emailBusy) return;
    setIsEmailModalOpen(false);
    setEmailStatus('idle');
  };

  const handlePasswordChange = async () => {
    if (passwordBusy) return;
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
    if (emailBusy) return;
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

  const handleCimeSync = async (dryRun: boolean) => {
    setIsCimeSyncing(true);
    setCimeSyncResult(null);
    setCimeCandidates(null);
    setReplaySample(null);
    try {
      const res = await fetch(dryRun ? '/api/cron/update-cime-replays?dryRun=1' : '/api/cron/update-cime-replays', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`
        }
      });
      const data = await res.json();
      if (dryRun && typeof data.candidates === 'number') {
        setCimeCandidates(Array.isArray(data.preview) ? data.preview : null);
        const summary = `저장 없이 연결 후보 ${data.candidates}개를 찾았습니다.`;
        setCimeSyncResult(data.error ? `${summary} ${data.error}` : summary);
      } else if (res.ok) {
        setCimeSyncResult(`다시보기 ${data.updated}개를 연결했습니다.`);
        toast.success('씨미 다시보기 동기화가 완료되었습니다.');
      } else {
        const summary = data.updated > 0 ? `다시보기 ${data.updated}개 연결됨. ` : '';
        setCimeSyncResult(summary + (data.error || '동기화 중 오류가 발생했습니다.'));
        toast.error('동기화 중 오류가 발생했습니다.');
      }
      if (!dryRun && data.updated > 0) mutate();
    } catch {
      setCimeSyncResult('❌ 네트워크 오류가 발생했습니다.');
      toast.error('네트워크 오류가 발생했습니다.');
    } finally {
      setIsCimeSyncing(false);
    }
  };

  const handleYouTubeLink = (preview: boolean) => {
    if (!editSchedule || !session) return;
    setReplaySample(null);
    void runAutoLink(editSchedule, currentDate, session.access_token, setEditSchedule, preview);
  };

  if (isCheckingSession) return <ScheduleSkeleton rowCount={schedule.characters.length || undefined} />;

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

  if (!editSchedule && scheduleError && isUsingMock) {
    return (
      <main className="grid place-content-center gap-4 text-center">
        <p role="status">시간표를 불러오지 못했어요.</p>
        <button type="button" className={headerStyles.button} onClick={() => void mutate()}>다시 시도</button>
      </main>
    );
  }

  if (!editSchedule) {
    return (
      <div className="h-full overflow-hidden flex flex-col items-center select-none w-full">
        <ScheduleSkeleton rowCount={schedule.characters.length || undefined} />
      </div>
    );
  }

  const effectiveSchedule = editSchedule;
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
            selectedCharacters={new Set(gridDisplayData.characters.map(({ id }) => id))}
            collaborationCharacters={role === 'admin' ? effectiveSchedule.characters : gridDisplayData.characters}
            isEditable={true}
            theme={theme}
            onCellUpdate={(charId, day, field, value) => updateDay(charId, day, field as keyof ScheduleItem, value)}
            onPartUpdate={updatePart}
            onAddPart={addPart}
            onCollabUpdate={updateCollaboration}
            onCellBlur={(charId, day, field, value) => {
              if (field === 'time') handleTimeBlur(charId, day, value);
            }}
            onMemoAdded={() => mutate()}
            onPrevWeek={() => navigateWeek(-1)}
            onNextWeek={() => navigateWeek(1)}
            dateSelector={<ScheduleWeekPicker date={currentDate} theme={theme} onChange={setCurrentDate} />}
            headerControls={
              <div className={adminStyles.toolbar} role="group" aria-label="관리자 도구">
                <button type="button" className={headerStyles.button} onClick={() => setIsAutoLinkModalOpen(true)}>
                  <MenuIcon name="play" size={14} /> 유튜브 자동 연결
                </button>
                <button type="button" className={headerStyles.button} onClick={() => setIsCimeSyncModalOpen(true)}>
                  <MenuIcon name="link" size={14} /> 씨미 다시보기 연결
                </button>
                <button type="button" className={`${headerStyles.button} ${headerStyles.iconButton}`} aria-label="관리자 가이드" title="관리자 가이드" onClick={() => setIsAdminInfoOpen(true)}>
                  <span aria-hidden="true">?</span>
                </button>
                <div className={`hidden md:flex items-center gap-2 mr-2 ${headerStyles.account}`}>
                  {loggedInChar ? (
                    <img
                      src={`/api/proxy/image?url=${encodeURIComponent(loggedInChar.avatarUrl)}`}
                      alt={loggedInChar.name}
                      className={`object-cover ${headerStyles.accountAvatar}`}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className={headerStyles.accountAvatar} aria-hidden="true">
                      A
                    </span>
                  )}
                  <span>{loggedInChar ? loggedInChar.name : '관리자'}</span>
                </div>
                <button type="button" className={`${headerStyles.button} ${adminStyles.primary}`} disabled={isSaving} onClick={handleSave}>
                  {isSaving ? '저장 중…' : '변경사항 저장'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(true)}
                  aria-controls="admin-side-menu"
                  aria-expanded={isMenuOpen}
                  className={headerStyles.button}
                >
                  <MenuIcon name="menu" size={16} />
                  <span>메뉴</span>
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
        filterMemberId={filterMemberId}
        characters={characters}
        loggedInChar={loggedInChar}
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
        type="button"
        aria-label="메뉴"
        aria-controls="admin-side-menu"
        aria-expanded={isMenuOpen}
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

      <BaseModal
        isOpen={isAutoLinkModalOpen}
        onClose={() => { if (autoLinkStatus !== 'loading') setIsAutoLinkModalOpen(false); }}
        title="유튜브 다시보기 자동 연결"
        variant="sheet"
        maxWidth="840px"
      >
        <div className={adminStyles.sheetBody}>
          <details>
            <summary>자동 연결 설명서</summary>
            <p className="mt-2">등록된 채널의 최근 영상 10개에서 제목에 포함된 방송 날짜를 찾아 선택한 주의 일정에 연결합니다. 날짜는 251010, 25.10.10, 25-10-10처럼 입력할 수 있습니다. 연결 결과는 변경사항 저장을 누르면 반영됩니다.</p>
          </details>
          <div className={adminStyles.columns}>
            <section aria-label="채널 ID 설정">
              <h3>채널 ID 설정</h3>
              <p>등록한 채널만 자동으로 연결합니다. 채널 ID는 변경사항 저장과 함께 반영돼요.</p>
              {characters.map(char => (
                <label key={char.id} className={adminStyles.field}>
                  <span>{char.name}</span>
                  <input
                    value={char.youtubeChannelId || ''}
                    onChange={event => updateYoutubeId(char.id, event.target.value)}
                    placeholder="YouTube 채널 ID"
                    disabled={autoLinkStatus === 'loading'}
                  />
                </label>
              ))}
            </section>
            <div className={adminStyles.replayOutput}>
              <ReplayCandidateList platform="youtube" candidates={previewCandidates} sample={replaySample === 'youtube'} />
              {replaySample !== 'youtube' && (
                <section aria-label="진행 로그">
                  <h3>진행 로그</h3>
                  <div role="log" className={adminStyles.logs}>
                    {autoLinkLogs.length === 0 ? <p>조회 결과가 여기에 표시됩니다.</p> :
                      autoLinkLogs.map((log, index) => <p key={index}>{log}</p>)}
                  </div>
                </section>
              )}
            </div>
          </div>
          <div className={adminStyles.actions}>
            <button type="button" onClick={() => setReplaySample('youtube')} disabled={autoLinkStatus === 'loading'} className={headerStyles.button}>
              샘플 보기
            </button>
            <button type="button" onClick={() => handleYouTubeLink(true)} disabled={autoLinkStatus === 'loading' || isSaving} className={headerStyles.button}>
              연결 후보 미리보기
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving || autoLinkStatus === 'loading'} className={headerStyles.button}>
              {isSaving ? '저장 중…' : '변경사항 저장'}
            </button>
            <button
              type="button"
              onClick={() => handleYouTubeLink(false)}
              disabled={autoLinkStatus === 'loading' || isSaving || !editSchedule || !session}
              className={`${headerStyles.button} ${adminStyles.primary}`}
            >
              {autoLinkStatus === 'loading' ? '자동 연결 중…' : '자동 연결 시작'}
            </button>
          </div>
        </div>
      </BaseModal>

      <BaseModal isOpen={isPasswordModalOpen} onClose={closePasswordModal} title="비밀번호 변경" variant="sheet" focusCloseOnOpen>
        <form className={adminStyles.sheetBody} onSubmit={event => { event.preventDefault(); void handlePasswordChange(); }}>
          <label className={adminStyles.field}>
            새 비밀번호
            <input type="password" autoComplete="new-password" required minLength={6} value={newPassword}
              onChange={event => setNewPassword(event.target.value)} placeholder="6자 이상 입력" />
          </label>
          <label className={adminStyles.field}>
            비밀번호 확인
            <input type="password" autoComplete="new-password" required value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)} placeholder="한 번 더 입력" />
          </label>
          {passwordStatus === 'success' && <p role="status">비밀번호를 변경했어요.</p>}
          <div className={adminStyles.actions}>
            <button type="button" onClick={closePasswordModal} disabled={passwordBusy} className={headerStyles.button}>취소</button>
            <button type="submit" disabled={passwordBusy} className={`${headerStyles.button} ${adminStyles.primary}`}>
              {passwordStatus === 'loading' ? '변경 중…' : '변경하기'}
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal isOpen={isEmailModalOpen} onClose={closeEmailModal} title="문의 이메일 변경" variant="sheet" focusCloseOnOpen>
        <form className={adminStyles.sheetBody} onSubmit={event => { event.preventDefault(); void handleEmailUpdate(); }}>
          <label className={adminStyles.field}>
            이메일 주소
            <input type="email" autoComplete="email" required value={inquiryEmail}
              onChange={event => setInquiryEmail(event.target.value)} placeholder="name@example.com" />
          </label>
          {emailStatus === 'success' && <p role="status">문의 이메일을 저장했어요.</p>}
          <div className={adminStyles.actions}>
            <button type="button" onClick={closeEmailModal} disabled={emailBusy} className={headerStyles.button}>취소</button>
            <button type="submit" disabled={emailBusy} className={`${headerStyles.button} ${adminStyles.primary}`}>
              {emailStatus === 'loading' ? '저장 중…' : '저장하기'}
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal isOpen={isCimeSyncModalOpen} onClose={() => setIsCimeSyncModalOpen(false)} title="씨미 다시보기 연결" variant="sheet">
        <div className={adminStyles.sheetBody}>
          <p>씨미 채널에 공개된 최근 다시보기를 찾아 시간표에 연결합니다.</p>
          {cimeSyncResult && replaySample !== 'cime' && <p role="status">{cimeSyncResult}</p>}
          <ReplayCandidateList platform="cime" candidates={cimeCandidates} sample={replaySample === 'cime'} />
          <div className={adminStyles.actions}>
            <button type="button" onClick={() => setReplaySample('cime')} disabled={isCimeSyncing} className={headerStyles.button}>
              샘플 보기
            </button>
            <button type="button" onClick={() => handleCimeSync(true)} disabled={isCimeSyncing} className={headerStyles.button}>
              연결 후보 미리보기
            </button>
            <button
              type="button"
              onClick={() => handleCimeSync(false)}
              disabled={isCimeSyncing}
              className={`${headerStyles.button} ${adminStyles.primary}`}
            >
              {isCimeSyncing ? '동기화 중…' : '동기화 시작'}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
