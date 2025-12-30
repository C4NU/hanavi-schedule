"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WeeklySchedule, ScheduleItem } from '@/types/schedule';
import ScheduleGrid from '@/components/ScheduleGrid';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState<string>(''); // 'admin' or memberId
    // const { schedule: initialSchedule } = useSchedule(); // This hook is no longer used
    const [editSchedule, setEditSchedule] = useState<WeeklySchedule | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // New states for date picker
    // Navigation State: Start with current week's Monday
    // Calculate current Monday:
    const getInitialMonday = () => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        d.setDate(diff);
        return d;
    };

    const [currentDate, setCurrentDate] = useState<Date>(getInitialMonday());

    // Member Filter State for Admin
    const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
    const [isMemberMenuOpen, setIsMemberMenuOpen] = useState(false);

    // Remove currentDayIndex and its useEffect
    // const [currentDayIndex, setCurrentDayIndex] = useState(0);
    // useEffect(() => {
    //     // Initialize to current day (Mon=0...Sun=6)
    //     const today = new Date().getDay(); // 0(Sun) - 6(Sat)
    //     setCurrentDayIndex((today + 6) % 7);
    // }, []);

    // Helpers
    const getWeekRangeString = (monday: Date) => {
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const sM = (monday.getMonth() + 1).toString().padStart(2, '0');
        const sD = monday.getDate().toString().padStart(2, '0');
        const eM = (sunday.getMonth() + 1).toString().padStart(2, '0');
        const eD = sunday.getDate().toString().padStart(2, '0');

        return `${sM}.${sD} - ${eM}.${eD}`;
    };

    const navigateWeek = (direction: -1 | 1) => {
        setCurrentDate(prev => {
            const next = new Date(prev);
            next.setDate(prev.getDate() + (direction * 7));
            return next;
        });
    };

    // Auth State
    useEffect(() => {
        // Check active session
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const success = await fetchUserRole(session.user.id);
                if (success) setIsAuthenticated(true);
            }
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                const success = await fetchUserRole(session.user.id);
                if (success) setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
                setRole('');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserRole = async (userId: string) => {
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('id', userId)
            .single();

        if (data) {
            setRole(data.role);
            return true;
        } else if (error) {
            console.error('Error fetching role:', error.message, error.details || '', error.hint || '');
            return false;
        }
        return false;
    };

    // Initialize Date and editSchedule
    // Fetch Schedule When Date Changes
    useEffect(() => {
        const fetchSchedule = async () => {
            const rangeString = getWeekRangeString(currentDate);
            console.log('Fetching schedule for:', rangeString);

            try {
                const res = await fetch(`/api/schedule?week=${encodeURIComponent(rangeString)}`);
                if (res.ok) {
                    const data = await res.json();
                    setEditSchedule(data); // This data will have defaults if new
                } else {
                    console.error('Failed to fetch schedule');
                }
            } catch (e) {
                console.error('Error fetching schedule:', e);
            }
        };

        fetchSchedule();
    }, [currentDate]);

    // Fetch Global Settings (Email)
    useEffect(() => {
        if (isAuthenticated) {
            fetch('/api/settings')
                .then(res => res.json())
                .then(data => {
                    if (data.email) setInquiryEmail(data.email);
                })
                .catch(console.error);
        }
    }, [isAuthenticated]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Map simple ID to pseudo-email
            const email = `${id}@hanavi.internal`;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                alert('로그인 실패: 아이디 또는 비밀번호를 확인하세요.');
                console.error(error.message);
            } else {
                // Success handled by onAuthStateChange logic
                // No need to reload, state update is synchronized now
            }
        } catch (e) {
            alert('로그인 에러: ' + e);
        }
    };

    // Password Change State
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    // Email Change State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [inquiryEmail, setInquiryEmail] = useState('');
    const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handlePasswordChange = async () => {
        if (!newPassword || !confirmPassword) {
            alert('비밀번호를 입력해주세요.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }
        if (newPassword.length < 6) {
            alert('비밀번호는 6자 이상이어야 합니다.');
            return;
        }

        setPasswordStatus('loading');
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            setPasswordStatus('success');
            setTimeout(() => {
                setIsPasswordModalOpen(false);
                setNewPassword('');
                setConfirmPassword('');
                setPasswordStatus('idle');
            }, 1500);
        } catch (e: any) {
            console.error(e);
            alert('비밀번호 변경 실패: ' + e.message);
            setPasswordStatus('error');
        }
    };

    const handleEmailUpdate = async () => {
        if (!inquiryEmail) return alert('이메일을 입력해주세요.');

        setEmailStatus('loading');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
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
        } catch (e: any) {
            console.error(e);
            setEmailStatus('error');
            alert('이메일 변경 실패: ' + e.message);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setRole('');
        setId('');
        setPassword('');
        // window.location.reload(); // Not strictly needed with onAuthStateChange, but cleaner reset
    };

    // Notification Logic
    const [notifyStatus, setNotifyStatus] = useState<'idle' | 'pending' | 'sending' | 'sent' | 'error'>('idle');
    const [timeLeft, setTimeLeft] = useState(0);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const notifyTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
        };
    }, []);

    // Countdown Effect
    useEffect(() => {
        if (timeLeft > 0 && notifyStatus === 'pending') {
            const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && notifyStatus === 'pending') {
            sendNotification();
        }
    }, [timeLeft, notifyStatus]);

    const sendNotification = async () => {
        setNotifyStatus('sending');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session');

            const res = await fetch('/api/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    title: '스케줄 업데이트 📢',
                    body: '이번 주 스케줄이 수정되었습니다! 확인해보세요 ✨'
                })
            });
            if (res.ok) {
                setNotifyStatus('sent');
                setTimeout(() => setNotifyStatus('idle'), 5000); // Reset after 5s
            } else {
                setNotifyStatus('error');
            }
        } catch (e) {
            console.error(e);
            setNotifyStatus('error');
        }
    };

    const cancelNotification = () => {
        if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
        setNotifyStatus('idle');
        setTimeLeft(0);
    };

    const handleSave = async () => {
        if (!editSchedule) return;
        setIsSaving(true);
        // Cancel any pending notification on new save
        if (notifyStatus === 'pending') cancelNotification();

        // Get current session token
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            handleLogout();
            setIsSaving(false);
            return;
        }

        try {
            const res = await fetch('/api/admin/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(editSchedule)
            });

            if (res.ok) {
                localStorage.setItem('hanavi_last_schedule', JSON.stringify(editSchedule));
                setNotifyStatus('pending');
                setTimeLeft(60);
                setIsModalVisible(true);
            } else {
                if (res.status === 401) {
                    alert('인증 실패: 다시 로그인해주세요.');
                    setIsAuthenticated(false);
                    sessionStorage.clear();
                } else {
                    alert('저장 실패: 서버 오류');
                }
            }
        } catch (e) {
            alert('에러 발생: ' + e);
        } finally {
            setIsSaving(false);
        }
    };

    const updateDay = (charId: string, day: string, field: keyof ScheduleItem, value: string) => {
        if (!editSchedule) return;
        setEditSchedule(prev => {
            if (!prev) return null;
            const newSchedule = { ...prev };
            const char = newSchedule.characters.find(c => c.id === charId);
            if (char) {
                if (!char.schedule[day]) {
                    char.schedule[day] = { time: '', content: '', type: 'stream' };
                }
                // @ts-ignore
                char.schedule[day][field] = value;

                // Auto-fill logic
                if (field === 'type') {
                    if (value === 'stream' && !char.schedule[day].time) {
                        // Character Specific Default Times
                        const defaultTimes: Record<string, string> = {
                            'varessa': '08:00',
                            'nemu': '12:00',
                            'maroka': '14:00',
                            'mirai': '15:00',
                            'ruvi': '19:00',
                            'iriya': '24:00'
                        };
                        char.schedule[day].time = defaultTimes[charId] || '19:00';
                    }
                }
            }
            return newSchedule;
        });
    };

    const handleTimeBlur = (charId: string, day: string, value: string) => {
        let newValue = value.trim();
        // If it's a number like "9", "12", "1" (1 or 2 digits)
        if (/^\d{1,2}$/.test(newValue)) {
            const num = parseInt(newValue, 10);
            if (num >= 0 && num <= 24) {
                newValue = `${num.toString().padStart(2, '0')}:00`;
                updateDay(charId, day, 'time', newValue);
            }
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-50">
                <form onSubmit={handleLogin} className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-sm border border-gray-100">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold mt-4 text-gray-800">관리자 로그인</h1>
                    </div>
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            placeholder="아이디"
                            className="bg-gray-50 border border-gray-200 p-4 w-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all text-left placeholder-gray-400"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호"
                            className="bg-gray-50 border border-gray-200 p-4 w-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all text-left placeholder-gray-400"
                        />
                    </div>
                    <button type="submit" className="mt-8 bg-pink-400 text-white w-full py-4 rounded-2xl hover:bg-pink-500 font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                        로그인
                    </button>

                </form>
            </div>
        );
    }

    if (!editSchedule) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-bold animate-pulse">스케줄 로딩중...</div>;

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    // Filter characters if role is not admin
    const visibleCharacters = editSchedule.characters.filter(char => {
        if (role === 'admin') {
            if (filterMemberId) return char.id === filterMemberId;
            return true;
        }
        return char.id === role;
    });

    // Helper to get dynamic styles based on theme
    const getThemeStyles = (theme: string) => {
        if (theme === 'admin') {
            return {
                bg: '#F3F4F6', // gray-100
                border: '#E5E7EB', // gray-200
                text: '#4B5563', // gray-600
                time: '#6B7280' // gray-500
            };
        }
        return {
            bg: `var(--color-${theme}-bg)`,
            border: `var(--color-${theme}-border)`,
            text: `var(--color-${theme}-text)`,
            time: `var(--color-${theme}-time)`
        };
    };

    // Helper for Input Cells (Handling Types)
    const getInputStyles = (theme: string, type: string) => {
        // Special Collabs (Hardcoded values from CSS or logic)
        if (type === 'collab_maivi') return { backgroundColor: 'var(--color-maivi-bg)', borderColor: 'var(--color-maivi-border)', color: 'var(--color-maivi-time)' };
        if (type === 'collab_hanavi') return { backgroundColor: 'var(--color-hanavi-bg)', borderColor: 'var(--color-hanavi-border)', color: 'var(--color-hanavi-time)' };
        if (type === 'collab_universe') return { backgroundColor: 'var(--color-universe-bg)', borderColor: 'var(--color-universe-border)', color: 'var(--color-universe-time)' };
        if (type === 'collab') return { backgroundColor: 'var(--color-universe-bg)', borderColor: 'var(--color-universe-border)', color: 'var(--color-universe-time)' };

        // Off State
        if (type === 'off') return { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#9CA3AF' };

        // Default Stream
        const styles = getThemeStyles(theme);
        return {
            backgroundColor: 'white', // Cells are white, border is colored
            borderColor: styles.border,
            color: '#333333' // Text content is dark
        };
    };

    // Find logged in character for Header display
    const loggedInChar = editSchedule?.characters.find(c => c.id === role);

    // Find filtered member object
    const selectedMember = filterMemberId ? editSchedule.characters.find(c => c.id === filterMemberId) : null;

    // Filter Logic
    const showProfileCol = role === 'admin' && !filterMemberId;

    // Filter editSchedule for Grid Display
    let gridDisplayData = editSchedule;

    if (gridDisplayData) {
        if (role !== 'admin') {
            // Member Login: Force filter to own ID
            gridDisplayData = {
                ...gridDisplayData,
                characters: gridDisplayData.characters.filter(c => c.id === role)
            };
        } else if (filterMemberId) {
            // Admin Login: Filter if dropdown selected
            gridDisplayData = {
                ...gridDisplayData,
                characters: gridDisplayData.characters.filter(c => c.id === filterMemberId)
            };
        }
    }

    return (
        <div className="h-full overflow-hidden flex flex-col items-center select-none">
            {/* Notification Status UI */}
            {/* Notification Status Modal */}
            {notifyStatus !== 'idle' && isModalVisible && (
                <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className={`bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border-2 transform transition-all relative
                    ${notifyStatus === 'pending' ? 'border-yellow-400' : ''}
                    ${notifyStatus === 'sending' ? 'border-blue-400' : ''}
                    ${notifyStatus === 'sent' ? 'border-green-400' : ''}
                    ${notifyStatus === 'error' ? 'border-red-400' : ''}
                    `}>
                        {/* Close Button (X) - Hides UI only */}
                        <button
                            onClick={() => setIsModalVisible(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex flex-col items-center text-center gap-4">
                            <span className="text-4xl animate-bounce">
                                {notifyStatus === 'pending' && '⏳'}
                                {notifyStatus === 'sending' && '🚀'}
                                {notifyStatus === 'sent' && '✅'}
                                {notifyStatus === 'error' && '⚠️'}
                            </span>

                            <h3 className="text-xl font-bold text-gray-800">
                                {notifyStatus === 'pending' && '변경사항 저장 완료!'}
                                {notifyStatus === 'sending' && '알림 전송 중...'}
                                {notifyStatus === 'sent' && '전송 완료!'}
                                {notifyStatus === 'error' && '오류 발생'}
                            </h3>

                            <div className="text-gray-600 font-medium">
                                {notifyStatus === 'pending' && (
                                    <>
                                        <p>약 {timeLeft}초 뒤에 스케줄 변경 알림이 전송됩니다.</p>
                                        <span className="text-xs text-gray-400 font-normal mt-1 block">(추가 변경 시 타이머가 초기화됩니다)</span>
                                    </>
                                )}
                                {notifyStatus === 'sending' && <p>잠시만 기다려주세요.</p>}
                                {notifyStatus === 'sent' && <p>모든 작업이 성공적으로 처리되었습니다.</p>}
                            </div>

                            {/* Action Buttons (Only while pending) */}
                            {notifyStatus === 'pending' && (
                                <div className="flex gap-3 w-full mt-2">
                                    <button
                                        onClick={cancelNotification}
                                        className="flex-1 py-2 px-4 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 font-bold transition-colors"
                                    >
                                        취소 (알림 X)
                                    </button>
                                    <button
                                        onClick={() => setTimeLeft(0)}
                                        className="flex-1 py-2 px-4 rounded-xl bg-blue-500 text-white hover:bg-blue-600 font-bold shadow-md transition-colors"
                                    >
                                        지금 보내기
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Grid Container - Replaced with ScheduleGrid Component */}
            <div className="w-full flex justify-center min-h-0 flex-1 overflow-hidden">
                {gridDisplayData && (
                    <ScheduleGrid
                        data={gridDisplayData}
                        isEditable={true}
                        onCellUpdate={(charId, day, field, value) => updateDay(charId, day, field as any, value)}
                        onCellBlur={(charId, day, field, value) => {
                            if (field === 'time') handleTimeBlur(charId, day, value);
                        }}
                        onPrevWeek={() => navigateWeek(-1)}
                        onNextWeek={() => navigateWeek(1)}
                        headerControls={
                            <div className="flex flex-col md:items-end w-full md:w-auto gap-2">
                                {/* Top Row: Profile, Save, Logout */}
                                <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">
                                    {/* Profile Badge & Dropdown */}
                                    <div className="relative z-[60]">
                                        <button
                                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                            className="flex px-2 py-1 rounded-[10px] items-center gap-2 border-2 transition-colors mr-2 h-[40px] hover:brightness-95 active:scale-95 transition-transform cursor-pointer"
                                            style={{
                                                backgroundColor: getThemeStyles(role).bg,
                                                color: getThemeStyles(role).border,
                                                borderColor: getThemeStyles(role).border
                                            }}
                                        >
                                            {loggedInChar ? (
                                                <>
                                                    <img
                                                        src={`/api/proxy/image?url=${encodeURIComponent(loggedInChar.avatarUrl)}`}
                                                        alt={loggedInChar.name}
                                                        className="w-[24px] h-[24px] rounded-full bg-white object-cover"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                    <span className="text-sm font-bold" style={{ color: getThemeStyles(role).text }}>
                                                        {loggedInChar.name}
                                                    </span>
                                                    <span className="text-xs ml-1">▼</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-sm font-bold">Admin</span>
                                                    <span className="text-xs ml-1">▼</span>
                                                </>
                                            )}
                                        </button>

                                        {isProfileMenuOpen && (
                                            <div className="absolute top-full text-left left-0 md:left-auto md:right-2 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-40 py-2">
                                                <button
                                                    onClick={() => { setIsPasswordModalOpen(true); setIsProfileMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 font-bold text-sm transition-colors flex items-center gap-2"
                                                >
                                                    🔒 비밀번호 변경
                                                </button>
                                                {role === 'admin' && (
                                                    <button
                                                        onClick={() => { setIsEmailModalOpen(true); setIsProfileMenuOpen(false); }}
                                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 font-bold text-sm transition-colors flex items-center gap-2"
                                                    >
                                                        📧 이메일 변경
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Side Buttons Group */}
                                    <div className="flex items-center gap-2">
                                        {/* Save Button */}
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="bg-white border-2 border-pink-300 rounded-[10px] text-gray-500 font-bold px-4 hover:bg-pink-50 transition-colors shadow-sm text-sm disabled:opacity-50 h-[40px]"
                                        >
                                            {isSaving ? '⏳' : '저장'}
                                        </button>

                                        {/* Logout Button */}
                                        <button
                                            onClick={handleLogout}
                                            className="bg-white border-2 border-gray-300 rounded-[10px] text-gray-500 font-bold px-4 hover:bg-gray-50 transition-colors shadow-sm text-sm h-[40px]"
                                        >
                                            로그아웃
                                        </button>
                                    </div>
                                </div>

                                {/* Bottom Row: Member Selector (Admin Only) */}
                                {role === 'admin' && (
                                    <div className="relative z-[50]">
                                        <button
                                            onClick={() => setIsMemberMenuOpen(!isMemberMenuOpen)}
                                            className="justify-between bg-white px-3 rounded-[10px] border-2 border-pink-300 shadow-sm flex items-center gap-2 hover:bg-pink-50 transition-colors h-[40px] min-w-[140px]"
                                        >
                                            {selectedMember ? (
                                                <img
                                                    src={`/api/proxy/image?url=${encodeURIComponent(selectedMember.avatarUrl)}`}
                                                    alt=""
                                                    className="w-6 h-6 rounded-full bg-gray-100 object-cover"
                                                />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">ALL</div>
                                            )}
                                            <span className="font-bold text-gray-500 text-sm">{selectedMember ? selectedMember.name : '전체 멤버'}</span>
                                            <span className="text-gray-400 text-xs text-[10px] ml-auto">▼</span>
                                        </button>

                                        {isMemberMenuOpen && (
                                            <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-48 py-2 z-[60]">
                                                <div
                                                    onClick={() => { setFilterMemberId(null); setIsMemberMenuOpen(false); }}
                                                    className="px-4 py-2 flex items-center gap-2 hover:bg-gray-50 cursor-pointer transition-colors"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">ALL</div>
                                                    <span className="font-bold text-gray-700 text-sm">전체 멤버</span>
                                                </div>
                                                {editSchedule.characters.map(char => (
                                                    <div
                                                        key={char.id}
                                                        onClick={() => { setFilterMemberId(char.id); setIsMemberMenuOpen(false); }}
                                                        className="px-4 py-2 flex items-center gap-2 hover:bg-gray-50 cursor-pointer transition-colors border-t border-gray-50"
                                                    >
                                                        <img
                                                            src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`}
                                                            alt=""
                                                            className="w-6 h-6 rounded-full bg-gray-100 object-cover"
                                                        />
                                                        <span className="font-bold text-gray-700 text-sm">{char.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        }
                    />
                )}
            </div>

            {/* Password Change Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border-2 border-pink-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>🔒</span> 비밀번호 변경
                        </h3>

                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">새 비밀번호</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all font-mono text-sm"
                                    placeholder="6자 이상 입력"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">비밀번호 확인</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all font-mono text-sm"
                                    placeholder="한 번 더 입력"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => { setIsPasswordModalOpen(false); setNewPassword(''); setConfirmPassword(''); }}
                                className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handlePasswordChange}
                                disabled={passwordStatus === 'loading'}
                                className="flex-1 py-3 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {passwordStatus === 'loading' ? '변경 중...' : '변경하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Change Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border-2 border-pink-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>📧</span> 문의 이메일 변경
                        </h3>

                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">이메일 주소</label>
                                <input
                                    type="email"
                                    value={inquiryEmail}
                                    onChange={(e) => setInquiryEmail(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all font-mono text-sm"
                                    placeholder="example@gmail.com"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => { setIsEmailModalOpen(false); setEmailStatus('idle'); }}
                                className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleEmailUpdate}
                                disabled={emailStatus === 'loading'}
                                className="flex-1 py-3 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {emailStatus === 'loading' ? '저장 중...' : '저장하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
