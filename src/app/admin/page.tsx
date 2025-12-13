"use client";

import { useState, useEffect, useRef } from 'react';
import { useSchedule } from '@/hooks/useSchedule';
import { WeeklySchedule, ScheduleItem } from '@/types/schedule';
import ScheduleGrid from '@/components/ScheduleGrid';

export default function AdminPage() {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState<string>(''); // 'admin' or memberId
    const { schedule: initialSchedule } = useSchedule();
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

    useEffect(() => {
        const storedSecret = sessionStorage.getItem('admin_secret');
        const storedId = sessionStorage.getItem('admin_id');
        const storedRole = sessionStorage.getItem('admin_role');
        if (storedSecret && storedRole) {
            setPassword(storedSecret);
            if (storedId) setId(storedId);
            setRole(storedRole);
            setIsAuthenticated(true);
        }
    }, []);

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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, password })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setIsAuthenticated(true);
                setRole(data.role);
                sessionStorage.setItem('admin_secret', password); // Store PW as secret for saving
                sessionStorage.setItem('admin_id', id);
                sessionStorage.setItem('admin_role', data.role);
            } else {
                alert('로그인 실패: 아이디 또는 비밀번호를 확인하세요.');
            }
        } catch (e) {
            alert('로그인 에러: ' + e);
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        setIsAuthenticated(false);
        setRole('');
        setId('');
        setPassword('');
        window.location.reload();
    };

    // Notification Logic
    const [notifyStatus, setNotifyStatus] = useState<'idle' | 'pending' | 'sending' | 'sent' | 'error'>('idle');
    const [timeLeft, setTimeLeft] = useState(0);
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
            const res = await fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secret: password,
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

        try {
            const res = await fetch('/api/admin/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': password
                },
                body: JSON.stringify(editSchedule)
            });

            if (res.ok) {
                // alert('저장되었습니다!'); // Removed alert to be less intrusive with auto-notify
                localStorage.setItem('hanavi_last_schedule', JSON.stringify(editSchedule));

                // Start Notification Countdown (60s)
                setNotifyStatus('pending');
                setTimeLeft(60);

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
            {notifyStatus !== 'idle' && (
                <div className={`w-full max-w-[1200px] mb-4 px-4 py-3 rounded-xl flex items-center justify-between gap-4 shadow-sm animate-fade-in
                ${notifyStatus === 'pending' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : ''}
                ${notifyStatus === 'sending' ? 'bg-blue-50 border border-blue-200 text-blue-800' : ''}
                ${notifyStatus === 'sent' ? 'bg-green-50 border border-green-200 text-green-800' : ''}
                ${notifyStatus === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : ''}
                `}>
                    <div className="flex items-center gap-3">
                        <span className="text-xl">
                            {notifyStatus === 'pending' && '⏳'}
                            {notifyStatus === 'sending' && '🚀'}
                            {notifyStatus === 'sent' && '✅'}
                            {notifyStatus === 'error' && '⚠️'}
                        </span>
                        <div>
                            <p className="font-bold text-sm md:text-base">
                                {notifyStatus === 'pending' && '변경사항이 감지되었습니다'}
                                {notifyStatus === 'sending' && '변경사항을 저장하고 알림을 보내는 중...'}
                                {notifyStatus === 'sent' && '저장 및 알림 전송 완료!'}
                                {notifyStatus === 'error' && '오류 발생'}
                            </p>
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
                        onPrevWeek={() => navigateWeek(-1)}
                        onNextWeek={() => navigateWeek(1)}
                        headerControls={
                            <div className="flex flex-col items-end gap-2">
                                {/* Top Row: Profile, Save, Logout */}
                                <div className="flex items-center gap-2">
                                    {/* Profile Badge */}
                                    <div
                                        className="hidden md:flex px-2 py-1 rounded-[10px] items-center gap-2 border-2 transition-colors mr-2 h-[40px]"
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
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-sm font-bold">Admin</span>
                                            </>
                                        )}
                                    </div>

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

        </div>
    );
}
