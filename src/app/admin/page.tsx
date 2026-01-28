"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WeeklySchedule, ScheduleItem } from '@/types/schedule';
import { MOCK_SCHEDULE } from '@/data/mockSchedule';
import ScheduleGrid from '@/components/ScheduleGrid';
import { supabase } from '@/lib/supabaseClient';
import AdminInfoModal from '@/components/AdminInfoModal';
import RegularHolidayModal from '@/components/RegularHolidayModal';

export default function AdminPage() {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState<string>(''); // 'admin' or memberId
    // const { schedule: initialSchedule } = useSchedule(); // This hook is no longer used
    const [editSchedule, setEditSchedule] = useState<WeeklySchedule | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [isAdminInfoOpen, setIsAdminInfoOpen] = useState(false);
    const [isRegularHolidayModalOpen, setIsRegularHolidayModalOpen] = useState(false);

    // New states for date picker
    // Navigation State: Start with current week's Monday
    // Calculate current Monday:
    const getInitialMonday = () => {
        console.log('[Debug] getInitialMonday called (Default State Initialization)');
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        d.setDate(diff);
        return d;
    };

    const [currentDate, setCurrentDate] = useState<Date>(getInitialMonday);
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false); // Navigation Dropdown State

    // Lifecycle Log
    useEffect(() => {
        console.log('[Debug] AdminPage Mounted');
        return () => console.log('[Debug] AdminPage Unmounted');
    }, []);

    // Member Filter State for Admin
    const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
    const [isMemberMenuOpen, setIsMemberMenuOpen] = useState(false);
    // Unified Menu State
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        console.log('[Debug] navigateWeek called:', direction);
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
                setSession(session);
                const success = await fetchUserRole(session.user.id);
                if (success) setIsAuthenticated(true);
            }
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[Debug] Auth State Change: ${event}`, session?.user?.id);
            setSession(session);
            if (session) {
                const success = await fetchUserRole(session.user.id);
                console.log('[Debug] onAuthStateChange -> fetchUserRole success:', success);
                if (success) setIsAuthenticated(true);
            } else {
                console.log('[Debug] Auth State Change: No Session (Logged out)');
                setIsAuthenticated(false);
                setRole('');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserRole = async (userId: string) => {
        console.log('[Debug] fetchUserRole called for:', userId);

        // Timeout Promise (3 seconds)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 3000)
        );

        try {
            const { data, error } = await Promise.race([
                supabase
                    .from('user_roles')
                    .select('role')
                    .eq('id', userId)
                    .single(),
                timeoutPromise
            ]) as any;

            if (data) {
                console.log('[Debug] Role found:', data.role);
                setRole(data.role);
                return true;
            } else if (error) {
                console.error('[Debug] Error fetching role:', error.message);
                return false;
            }
        } catch (e: any) {
            console.warn('[Debug] fetchUserRole Exception (Timeout or Error):', e.message);
            return false;
        }
        return false;
    };

    // Initialize Date and editSchedule
    // Fetch Schedule When Date Changes
    useEffect(() => {
        let ignore = false;

        const fetchSchedule = async () => {
            // Reset to loading state immediately when week changes
            // This prevents "bouncing" between old data and new data
            setEditSchedule(null);

            const rangeString = getWeekRangeString(currentDate);
            console.log('Fetching schedule for:', rangeString);

            if (!rangeString) return;

            try {
                // Add timestamp to prevent browser caching
                const res = await fetch(`/api/schedule?week=${encodeURIComponent(rangeString)}&t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
                });

                if (ignore) {
                    console.log('[Debug] Ignoring stale fetch result for:', rangeString);
                    return;
                }

                if (res.ok) {
                    const data = await res.json();
                    console.log('[Debug] Setting editSchedule to:', data?.weekRange);
                    setEditSchedule(data);
                } else {
                    console.error('Failed to fetch schedule');
                }
            } catch (e) {
                if (!ignore) console.error('Error fetching schedule:', e);
            }
        };

        fetchSchedule();

        return () => { ignore = true; };
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

    // State for Auto Link
    const [autoLinkStatus, setAutoLinkStatus] = useState<'idle' | 'loading' | 'success' | 'detail'>('idle');
    const [autoLinkResult, setAutoLinkResult] = useState<string>('');
    const [isAutoLinkModalOpen, setIsAutoLinkModalOpen] = useState(false);
    const [isAutoLinkInfoOpen, setIsAutoLinkInfoOpen] = useState(false); // New state for manual modal
    const [autoLinkLogs, setAutoLinkLogs] = useState<string[]>([]);

    const addLog = (message: string) => {
        setAutoLinkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const updateYoutubeId = (charId: string, newId: string) => {
        if (!editSchedule) return;
        setEditSchedule(prev => {
            if (!prev) return null;
            const newSchedule = { ...prev };
            const char = newSchedule.characters.find(c => c.id === charId);
            if (char) {
                char.youtubeChannelId = newId.trim();
            }
            return newSchedule;
        });
    };

    const runAutoLink = async () => {
        if (!editSchedule) return;

        // setIsAutoLinkModalOpen(true); // Already open
        setAutoLinkLogs([]);
        setAutoLinkStatus('loading');
        addLog('자동 연결 작업을 시작합니다...');

        let linkedCount = 0;
        let matchedDetails: string[] = [];

        // Determine current week's dates for matching
        const weekDates: { [key: string]: string } = {};
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

        days.forEach((day, index) => {
            const d = new Date(currentDate);
            d.setDate(currentDate.getDate() + index);
            const yy = d.getFullYear().toString().slice(2);
            const mm = (d.getMonth() + 1).toString().padStart(2, '0');
            const dd = d.getDate().toString().padStart(2, '0');
            weekDates[day] = `${yy}${mm}${dd}`;
        });

        addLog(`이번 주 날짜 범위를 계산했습니다. (${Object.values(weekDates)[0]} ~ ${Object.values(weekDates)[6]})`);
        // Debug Log for WeekDates
        console.log('[Debug] weekDates:', weekDates);
        addLog(`[Debug] 계산된 주간 날짜: ${JSON.stringify(weekDates)}`);

        // Use structuredClone for deep copy to ensure React detects changes and to avoid direct mutation
        const newSchedule = structuredClone(editSchedule);
        let hasChanges = false;
        const charactersWithId = newSchedule.characters.filter((c: any) => c.youtubeChannelId);

        addLog(`YouTube ID가 등록된 멤버 ${charactersWithId.length}명을 찾았습니다.`);

        for (const char of newSchedule.characters) {
            if (!char.youtubeChannelId) {
                // addLog(`[${char.name}] YouTube ID가 없어 건너뜁니다.`);
                continue;
            }

            addLog(`[${char.name}] 최근 영상을 조회합니다...`);

            try {
                const res = await fetch(`/api/youtube/videos?channelId=${char.youtubeChannelId}`);
                const data = await res.json();

                if (data.videos) {
                    addLog(`[${char.name}] ${data.videos.length}개의 최신 영상을 가져왔습니다.`);

                    for (const video of data.videos) {
                        const title = video.title;
                        const dateRegex = /(?:20)?(\d{2})[\.\-\/]?(\d{1,2})[\.\-\/]?(\d{2})/;
                        const match = title.match(dateRegex);

                        if (match) {
                            const yy = match[1];
                            const mm = match[2].padStart(2, '0');
                            const dd = match[3].padStart(2, '0');
                            const dateString = `${yy}${mm}${dd}`;

                            addLog(`  - [분석] 제목: "${title}" -> 날짜: ${dateString}`);

                            const targetDay = Object.keys(weekDates).find(day => weekDates[day] === dateString);

                            if (targetDay) {
                                addLog(`    => 매칭 성공! 요일: ${targetDay}`);
                                if (char.schedule[targetDay]) {
                                    let isUpdated = false;
                                    let updateLog = [];

                                    // 1. Check Video URL
                                    if (char.schedule[targetDay].videoUrl !== video.url) {
                                        char.schedule[targetDay].videoUrl = video.url;
                                        isUpdated = true;
                                        updateLog.push('영상 연결');
                                    }

                                    // 2. Check Content (Auto-fill)
                                    if (!char.schedule[targetDay].content || char.schedule[targetDay].content.trim() === '') {
                                        char.schedule[targetDay].content = title;
                                        isUpdated = true;
                                        updateLog.push('내용 입력');
                                    }

                                    if (isUpdated) {
                                        hasChanges = true;
                                        linkedCount++;
                                        const logMsg = `[수정됨] ${targetDay}(${dateString}): ${title} (${updateLog.join(', ')})`;
                                        matchedDetails.push(logMsg);
                                        addLog(`✅ ${logMsg}`);
                                    } else {
                                        addLog(`    - 이미 최신 상태입니다.`);
                                    }
                                }
                            }
                        }
                    }
                } else {
                    addLog(`[${char.name}] 영상을 가져오지 못했습니다. (데이터 없음)`);
                }
            } catch (err: any) {
                console.error(`Failed to fetch videos for ${char.name}:`, err);
                addLog(`[오류] ${char.name} 영상 조회 실패: ${err.message}`);
            }
        }

        if (hasChanges) {
            setEditSchedule(newSchedule);
            const resultMsg = `${linkedCount}개의 영상을 새로 연결했습니다. 저장 버튼을 눌러 적용하세요.`;
            setAutoLinkResult(`${linkedCount}개 연결됨 (저장 필요)`);
            addLog(`🎉 완료! ${resultMsg}`);
            setAutoLinkStatus('success');
        } else {
            const resultMsg = '연결할 새로운 영상이 없습니다.';
            setAutoLinkResult(resultMsg);
            addLog(`ℹ️ ${resultMsg}`);
            setAutoLinkStatus('success');
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[Debug] handleLogin started');
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
                console.log('[Debug] Login Success, Session:', !!data.session);
                // Manually update state immediately to fix refresh requirement
                if (data.session) {
                    setSession(data.session);
                    const success = await fetchUserRole(data.session.user.id);
                    console.log('[Debug] Manual fetchUserRole success:', success);
                    if (success) {
                        setIsAuthenticated(true);
                        // Optional: Clear fields
                        setPassword('');
                    } else {
                        // Fallback: If role fetch failed or timed out, force reload
                        console.warn('[Debug] Role fetch failed, reloading to refresh state');
                        window.location.reload();
                    }
                }
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
        console.log('[Debug] Save started');

        setIsSaving(true);
        // Cancel any pending notification on new save
        if (notifyStatus === 'pending') cancelNotification();

        // Get current session token
        console.log('[Debug] Using cached session...');

        if (!session) {
            console.warn('[Debug] No cached session found');
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            handleLogout();
            setIsSaving(false);
            return;
        }

        // Setup Timeout (e.g. 15 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            console.log('[Debug] Sending request to /api/admin/schedule...');
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

            console.log('[Debug] Response status:', res.status);

            if (res.ok) {
                console.log('[Debug] Save success');
                localStorage.setItem('hanavi_last_schedule', JSON.stringify(editSchedule));
                setNotifyStatus('pending');
                setTimeLeft(60);
                setIsModalVisible(true);
            } else {
                const errText = await res.text();
                console.error('[Debug] Save failed:', res.status, errText);

                if (res.status === 401) {
                    alert('인증 실패: 다시 로그인해주세요.');
                    setIsAuthenticated(false);
                    sessionStorage.clear();
                } else {
                    alert(`저장 실패: 서버 오류 (${res.status})`);
                }
            }
        } catch (e: any) {
            console.error('[Debug] Exception during save:', e);
            if (e.name === 'AbortError') {
                alert('저장 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.');
            } else {
                alert('에러 발생: ' + e);
            }
        } finally {
            setIsSaving(false);
            clearTimeout(timeoutId);
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
                    } else if (value === 'off') {
                        // [FIX] Clear time when setting to OFF
                        char.schedule[day].time = '';
                    }
                }
            }
            return newSchedule;
        });
    };

    const handleRegularHolidayUpdate = (updates: { id: string, holidays: string }[]) => {
        if (!editSchedule) return;
        setEditSchedule(prev => {
            if (!prev) return null;
            const newSchedule = { ...prev };
            updates.forEach(({ id, holidays }) => {
                const char = newSchedule.characters.find(c => c.id === id);
                if (char) {
                    char.regularHoliday = holidays;
                }
            });
            return newSchedule;
        });
        // Prompt user to save
        setNotifyStatus('idle'); // clear any existing status
        alert('정기 휴방 설정이 적용되었습니다. 우측 상단 "변경사항 저장" 버튼을 눌러 확정하세요.');
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



    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];



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
    const selectedMember = filterMemberId && editSchedule ? editSchedule.characters.find(c => c.id === filterMemberId) : null;

    // Filter Logic
    const showProfileCol = role === 'admin' && !filterMemberId;

    // Filter editSchedule for Grid Display
    // If editSchedule is null (loading), provide a skeleton schedule to prevent layout shift
    const effectiveSchedule = editSchedule || {
        ...MOCK_SCHEDULE,
        weekRange: getWeekRangeString(currentDate),
        characters: MOCK_SCHEDULE.characters.map(c => ({
            ...c,
            schedule: Object.keys(c.schedule).reduce((acc, day) => ({
                ...acc,
                [day]: { time: '', content: '', type: 'stream' }
            }), {}) as any
        }))
    };

    let gridDisplayData = effectiveSchedule;

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
            {/* Main Layout Container */}
            <div className="w-full min-h-0 flex-1 overflow-hidden">
                {editSchedule ? (
                    <ScheduleGrid
                        key={filterMemberId || 'all'}
                        data={gridDisplayData}
                        isEditable={true}
                        onCellUpdate={(charId, day, field, value) => updateDay(charId, day, field as any, value)}
                        onCellBlur={(charId, day, field, value) => {
                            if (field === 'time') handleTimeBlur(charId, day, value);
                        }}
                        onPrevWeek={() => navigateWeek(-1)}
                        onNextWeek={() => navigateWeek(1)}
                        dateSelector={
                            <div className="relative">
                                <button
                                    onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                                    className="text-lg md:text-xl font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 px-4 py-1 rounded-full transition-colors flex items-center gap-2"
                                >
                                    {getWeekRangeString(currentDate)}
                                    <span className="text-xs text-gray-500">▼</span>
                                </button>
                                {/* Date Dropdown */}
                                {isDateDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[150]" onClick={() => setIsDateDropdownOpen(false)} />
                                        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[151] max-h-60 overflow-y-auto py-1">
                                            {Array.from({ length: 9 }).map((_, i) => {
                                                const offset = i - 4; // -4 to +4 weeks
                                                const d = new Date(currentDate);
                                                d.setDate(d.getDate() + (offset * 7));
                                                const rangeStr = getWeekRangeString(d);
                                                const isCurrent = offset === 0;

                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setCurrentDate(d);
                                                            setIsDateDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-pink-50 transition-colors flex justify-between items-center
                                                            ${isCurrent ? 'bg-pink-100 text-pink-600' : 'text-gray-700'}
                                                        `}
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
                            <>
                                {/* Desktop Controls (Hidden on Mobile) */}
                                {/* Desktop Controls (Replaced by Menu Button) */}
                                <div className="hidden md:flex items-center gap-4">
                                    <div className="flex items-center gap-2 mr-2">
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
                                        className="px-4 py-2 bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-bold transition-colors flex items-center gap-2 h-[40px]"
                                    >
                                        <span>☰</span>
                                        <span>메뉴</span>
                                    </button>
                                </div>

                                {/* Mobile Menu Button (Visible only on mobile) */}
                                <button
                                    className="md:hidden fixed bottom-5 right-5 w-[50px] h-[50px] bg-white border-2 border-pink-300 rounded-full shadow-lg flex items-center justify-center z-[100] hover:bg-pink-50 transition-colors"
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                >
                                    <span className="text-2xl text-pink-400">☰</span>
                                </button>

                                {/* Mobile Menu Overlay */}
                                {isMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 bg-black/50 z-[101] md:hidden backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
                                        <div className="fixed bottom-[80px] right-5 w-64 bg-white rounded-2xl shadow-2xl z-[102] md:hidden overflow-hidden border border-pink-100 flex flex-col animate-slide-up">
                                            {/* Profile Section */}
                                            <div className="p-4 bg-pink-50 border-b border-pink-100 flex items-center gap-3">
                                                {loggedInChar ? (
                                                    <img
                                                        src={`/api/proxy/image?url=${encodeURIComponent(loggedInChar.avatarUrl)}`}
                                                        alt={loggedInChar.name}
                                                        className="w-10 h-10 rounded-full bg-white object-cover border border-pink-200"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-white border border-pink-200 flex items-center justify-center text-pink-300 font-bold">A</div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-gray-800">{loggedInChar ? loggedInChar.name : '관리자'}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {role === 'admin' ? '전체 권한' : '멤버 권한'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-2 space-y-1 overflow-y-auto max-h-[60vh]">
                                                {/* Main Actions */}
                                                <button
                                                    onClick={() => { handleSave(); setIsMenuOpen(false); }}
                                                    disabled={isSaving}
                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors"
                                                >
                                                    <span>💾</span>
                                                    <span>{isSaving ? '저장 중...' : '변경사항 저장'}</span>
                                                </button>

                                                <button
                                                    onClick={() => { setIsAdminInfoOpen(true); setIsMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors"
                                                >
                                                    <span>ℹ️</span>
                                                    <span>관리자 가이드</span>
                                                </button>

                                                <button
                                                    onClick={() => { setIsAutoLinkModalOpen(true); setIsMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors"
                                                >
                                                    <span>▶️</span>
                                                    <span>유튜브 자동 연결</span>
                                                    {autoLinkResult && (
                                                        <span className="ml-auto text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                                                            결과 있음
                                                        </span>
                                                    )}
                                                </button>

                                                <div className="h-px bg-gray-100 my-1 mx-2"></div>

                                                {/* Settings */}
                                                <button
                                                    onClick={() => { setIsPasswordModalOpen(true); setIsMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-600 transition-colors"
                                                >
                                                    <span>🔒</span>
                                                    <span>비밀번호 변경</span>
                                                </button>

                                                {role === 'admin' && (
                                                    <button
                                                        onClick={() => { setIsEmailModalOpen(true); setIsMenuOpen(false); }}
                                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-600 transition-colors"
                                                    >
                                                        <span>📧</span>
                                                        <span>문의 이메일 변경</span>
                                                    </button>
                                                )}

                                                <div className="h-px bg-gray-100 my-1 mx-2"></div>

                                                {/* Filter (Admin Only) */}
                                                {role === 'admin' && (
                                                    <div className="px-2">
                                                        <div className="text-xs font-bold text-gray-400 px-2 py-1 mb-1">멤버 필터</div>
                                                        <div className="grid grid-cols-2 gap-1">
                                                            <button
                                                                onClick={() => { setFilterMemberId(null); setIsMenuOpen(false); }}
                                                                className={`p-2 rounded-lg text-xs font-bold text-center border transition-colors ${!filterMemberId ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-white border-gray-100 text-gray-500'}`}
                                                            >
                                                                전체
                                                            </button>
                                                            {editSchedule?.characters.map(char => (
                                                                <button
                                                                    key={char.id}
                                                                    onClick={() => { setFilterMemberId(char.id); setIsMenuOpen(false); }}
                                                                    className={`p-2 rounded-lg text-xs font-bold text-center border transition-colors ${filterMemberId === char.id ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-white border-gray-100 text-gray-500'}`}
                                                                >
                                                                    {char.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="h-px bg-gray-100 my-2 mx-1"></div>
                                                    </div>
                                                )}

                                                {/* Logout */}
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 flex items-center gap-3 font-bold text-red-500 transition-colors"
                                                >
                                                    <span>🚪</span>
                                                    <span>로그아웃</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Desktop Sidebar (Visible only on Desktop) */}
                                {isMenuOpen && (
                                    <>
                                        <div className="hidden md:block fixed inset-0 bg-black/30 z-[90] backdrop-blur-sm animate-fade-in" onClick={() => setIsMenuOpen(false)} />
                                        <div className="hidden md:flex fixed top-0 right-0 h-full w-[360px] bg-white shadow-2xl z-[100] flex-col animate-slide-left border-l border-gray-100">
                                            {/* Header */}
                                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                                <div className="flex items-center gap-3">
                                                    {loggedInChar ? (
                                                        <img
                                                            src={`/api/proxy/image?url=${encodeURIComponent(loggedInChar.avatarUrl)}`}
                                                            alt={loggedInChar.name}
                                                            className="w-10 h-10 rounded-full bg-white object-cover border border-gray-200"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                                                            A
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-gray-800 text-lg">{loggedInChar ? loggedInChar.name : '관리자'}</div>
                                                        <div className="text-xs text-gray-500 font-medium">
                                                            {role === 'admin' ? '전체 관리자 권한' : '멤버 권한'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setIsMenuOpen(false)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-400 hover:text-gray-700 font-bold bg-transparent"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            {/* Scrollable Content */}
                                            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                                                <div className="px-2 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</div>

                                                <button
                                                    onClick={() => { handleSave(); setIsMenuOpen(false); }}
                                                    disabled={isSaving}
                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
                                                >
                                                    <span className="group-hover:scale-110 transition-transform">💾</span>
                                                    <span>{isSaving ? '저장 중...' : '변경사항 저장'}</span>
                                                </button>

                                                <button
                                                    onClick={() => { setIsAdminInfoOpen(true); setIsMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
                                                >
                                                    <span className="group-hover:scale-110 transition-transform">ℹ️</span>
                                                    <span>관리자 가이드</span>
                                                </button>

                                                <button
                                                    onClick={() => { setIsAutoLinkModalOpen(true); setIsMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
                                                >
                                                    <span className="group-hover:scale-110 transition-transform">▶️</span>
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <span>유튜브 자동 연결</span>
                                                        {autoLinkResult && (
                                                            <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">
                                                                {autoLinkResult}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => { setIsRegularHolidayModalOpen(true); setIsMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
                                                >
                                                    <span className="group-hover:scale-110 transition-transform">📅</span>
                                                    <span>정기 휴방 관리</span>
                                                </button>

                                                <div className="h-px bg-gray-100 my-4 mx-2"></div>

                                                <div className="px-2 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Settings</div>

                                                <button
                                                    onClick={() => { setIsPasswordModalOpen(true); setIsMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-600 transition-colors group"
                                                >
                                                    <span className="group-hover:scale-110 transition-transform">🔒</span>
                                                    <span>비밀번호 변경</span>
                                                </button>

                                                {role === 'admin' && (
                                                    <button
                                                        onClick={() => { setIsEmailModalOpen(true); setIsMenuOpen(false); }}
                                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-600 transition-colors group"
                                                    >
                                                        <span className="group-hover:scale-110 transition-transform">📧</span>
                                                        <span>문의 이메일 변경</span>
                                                    </button>
                                                )}

                                                <div className="h-px bg-gray-100 my-4 mx-2"></div>

                                                {role === 'admin' && (
                                                    <div className="px-2 mb-4">
                                                        <div className="text-xs font-bold text-gray-400 px-2 py-2 uppercase tracking-wider mb-2">Member Filter</div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button
                                                                onClick={() => { setFilterMemberId(null); setIsMenuOpen(false); }}
                                                                className={`p-3 rounded-xl text-sm font-bold text-center border transition-all hover:shadow-sm ${!filterMemberId ? 'bg-pink-50 border-pink-200 text-pink-600 ring-2 ring-pink-100' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                                                            >
                                                                전체 🌟
                                                            </button>
                                                            {editSchedule?.characters.map(char => (
                                                                <button
                                                                    key={char.id}
                                                                    onClick={() => { setFilterMemberId(char.id); setIsMenuOpen(false); }}
                                                                    className={`p-3 rounded-xl text-sm font-bold text-center border transition-all hover:shadow-sm ${filterMemberId === char.id ? 'bg-pink-50 border-pink-200 text-pink-600 ring-2 ring-pink-100' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                                                                >
                                                                    {char.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 flex items-center gap-3 font-bold transition-colors mt-auto group"
                                                >
                                                    <span className="group-hover:rotate-12 transition-transform">🚪</span>
                                                    <span>로그아웃</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        }
                    />
                ) : (
                    <div className="flex justify-center items-center h-[500px] text-gray-400">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-[800px] h-[400px] bg-gray-50 rounded-xl animate-pulse"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Menu Button - Styled to match User Page */}
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

            {/* Auto Link Log Modal with ID Management */}
            {
                isAutoLinkModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-left">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-scale-in relative">
                            {/* Help Overlay (Manual) */}
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
                                                <p>
                                                    불러온 유튜브 영상의 <strong>제목</strong>을 분석하여 날짜를 찾고,
                                                    해당 날짜에 맞는 스케줄 칸에 영상을 자동으로 연결합니다.
                                                </p>
                                            </div>

                                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                <h5 className="font-bold text-gray-900 mb-2">📌 날짜 인식 기준 (필터 구조)</h5>
                                                <p className="mb-2">다음과 같은 숫자 패턴을 날짜로 인식합니다:</p>
                                                <div className="font-mono bg-white p-2 rounded border border-gray-200 text-xs mb-3 space-y-1">
                                                    <div className="flex justify-between">
                                                        <span>"251010"</span>
                                                        <span>→ 2025년 10월 10일</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-500">
                                                        <span>"24.12.25"</span>
                                                        <span>→ 2024년 12월 25일</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-500">
                                                        <span>"24-01-01"</span>
                                                        <span>→ 2024년 01월 01일</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    * 연도 앞의 '20'은 생략 가능합니다.<br />
                                                    * 점(.)이나 하이픈(-)으로 구분되어 있어도 인식합니다.
                                                </p>
                                            </div>

                                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-xs text-yellow-800">
                                                <strong>주의:</strong> 제목에 날짜가 없거나 인식이 불가능한 형식이면 연결되지 않습니다.
                                            </div>

                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-500 mt-2">
                                                <strong>ℹ️ 기술적 안내:</strong><br />
                                                현재 유튜브 API 제한으로 인해 <strong>최근 50개의 영상</strong>까지만 자동으로 조회합니다.
                                                그 이전의 과거 영상은 수동으로 링크를 입력해주셔야 합니다.
                                                (추후 개선 예정)
                                            </div>
                                        </div>
                                        <div className="mt-6 text-center">
                                            <button
                                                onClick={() => setIsAutoLinkInfoOpen(false)}
                                                className="px-6 py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
                                            >
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
                                    <button
                                        onClick={() => setIsAutoLinkInfoOpen(true)}
                                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-200 transition-colors flex items-center gap-1"
                                    >
                                        <span>📘</span> 설명서
                                    </button>
                                </div>
                                <button
                                    onClick={() => setIsAutoLinkModalOpen(false)}
                                    disabled={autoLinkStatus === 'loading'}
                                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50 text-2xl"
                                >
                                    &times;
                                </button>
                            </div>

                            <div className="flex-1 flex min-h-0">
                                {/* Left: Logs */}
                                <div className="flex-1 flex flex-col border-r border-gray-100 min-w-0">
                                    <div className="p-3 bg-gray-100 border-b font-bold text-gray-600 flex justify-between items-center">
                                        <span>📡 진행 로그</span>
                                        {autoLinkStatus === 'idle' && autoLinkLogs.length === 0 && (
                                            <button
                                                onClick={runAutoLink}
                                                className="px-3 py-1 bg-red-500 text-white rounded text-sm font-bold hover:bg-red-600"
                                            >
                                                시작하기
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-gray-900 text-green-400">
                                        {autoLinkLogs.length === 0 && <div className="opacity-50 text-center mt-10">설정 확인 후 '시작하기'를 눌러주세요.</div>}
                                        {autoLinkLogs.map((log, i) => (
                                            <div key={i} className="mb-1 break-all">
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right: ID Inputs */}
                                <div className="w-[400px] flex flex-col bg-white min-w-0">
                                    <div className="p-3 bg-gray-50 border-b font-bold text-gray-600 flex justify-between items-center">
                                        <span>⚙️ 채널 ID 설정</span>
                                        <button
                                            onClick={handleSave}
                                            className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-100"
                                            title="전체 스케줄과 함께 저장됩니다"
                                        >
                                            ID 저장 (전체 저장)
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded mb-2">
                                            * 입력한 ID는 '저장' 버튼을 누르면 DB에 반영됩니다.<br />
                                            * ID가 등록된 멤버만 자동 연결이 수행됩니다.
                                        </div>
                                        {editSchedule?.characters.map(char => (
                                            <div key={char.id} className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`}
                                                        alt=""
                                                        className="w-5 h-5 rounded-full bg-gray-100"
                                                    />
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
                                <button
                                    onClick={runAutoLink}
                                    disabled={autoLinkStatus === 'loading'}
                                    className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-bold transition-all shadow-sm"
                                >
                                    {autoLinkStatus === 'loading' ? '작업 중...' : '▶️ 자동 연결 시작'}
                                </button>
                                <button
                                    onClick={() => setIsAutoLinkModalOpen(false)}
                                    disabled={autoLinkStatus === 'loading'}
                                    className="px-5 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-bold transition-all"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Password Modal */}
            {
                isPasswordModalOpen && (
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
                )
            }

            {/* Email Modal */}
            {
                isEmailModalOpen && (
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
                )
            }
        </div >
    );
}
