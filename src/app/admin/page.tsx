"use client";

import { useState, useEffect } from 'react';
import { useSchedule } from '@/hooks/useSchedule';
import { WeeklySchedule, ScheduleItem } from '@/types/schedule';

export default function AdminPage() {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState<string>(''); // 'admin' or memberId
    const { schedule: initialSchedule } = useSchedule();
    const [editSchedule, setEditSchedule] = useState<WeeklySchedule | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // New states for date picker
    const [startMonth, setStartMonth] = useState('1');
    const [startDay, setStartDay] = useState('1');
    const [endMonth, setEndMonth] = useState('1');
    const [endDay, setEndDay] = useState('1');

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

    // Helper: Get Current Week Monday & Sunday
    const getCurrentWeek = () => {
        const curr = new Date();
        const first = curr.getDate() - curr.getDay() + 1; // Monday
        const last = first + 6; // Sunday

        const monday = new Date(curr.setDate(first));
        const sunday = new Date(curr.setDate(last));

        return {
            sM: (monday.getMonth() + 1).toString(),
            sD: monday.getDate().toString(),
            eM: (sunday.getMonth() + 1).toString(),
            eD: sunday.getDate().toString()
        };
    };

    // Helper: Parse existing range string "12.09 - 12.15"
    const parseWeekRange = (range: string) => {
        try {
            const [start, end] = range.split(' - ');
            const [sM, sD] = start.split('.');
            const [eM, eD] = end.split('.');
            return { sM, sD, eM, eD };
        } catch (e) {
            return null;
        }
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
    useEffect(() => {
        if (initialSchedule) {
            // First, deep copy
            const cloned = JSON.parse(JSON.stringify(initialSchedule));
            setEditSchedule(cloned);

            // Determine Date Range
            let dateState = null;
            if (cloned.weekRange) {
                dateState = parseWeekRange(cloned.weekRange);
            }

            // If parse failed or empty, use Current Week
            if (!dateState || !dateState.sM) {
                dateState = getCurrentWeek();
            }

            setStartMonth(dateState.sM);
            setStartDay(dateState.sD);
            setEndMonth(dateState.eM);
            setEndDay(dateState.eD);
        }
    }, [initialSchedule]);

    // Update weekRange string when date parts change
    useEffect(() => {
        if (editSchedule) {
            const newRange = `${startMonth.padStart(2, '0')}.${startDay.padStart(2, '0')} - ${endMonth.padStart(2, '0')}.${endDay.padStart(2, '0')}`;
            // Avoid infinite loop if no change
            if (editSchedule.weekRange !== newRange) {
                setEditSchedule(prev => prev ? ({ ...prev, weekRange: newRange }) : null);
            }
        }
    }, [startMonth, startDay, endMonth, endDay, editSchedule]); // depend on parts and editSchedule to prevent stale closure

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

    const handleSave = async () => {
        if (!editSchedule) return;
        setIsSaving(true);
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
                alert('저장되었습니다!');
                localStorage.setItem('hanavi_last_schedule', JSON.stringify(editSchedule));
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
    const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    const dates = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

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

    return (
        <div className="h-full overflow-hidden bg-[#FDFCFE] p-4 md:p-6 flex flex-col items-center">
            {/* Header / Controls */}
            <div className={`w-full max-w-[1200px] mb-4 flex-shrink-0 flex flex-col lg:flex-row justify-between items-center bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 gap-4`}>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Profile Badge */}
                    <div
                        className="p-2 rounded-[20px] flex items-center gap-3 border-2 transition-colors pr-6 w-full md:w-auto justify-center md:justify-start"
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
                                    className="w-[50px] h-[50px] rounded-full bg-white object-cover"
                                    referrerPolicy="no-referrer"
                                />
                                <span className="text-xl font-bold" style={{ color: getThemeStyles(role).text }}>
                                    {loggedInChar.name}
                                </span>
                            </>
                        ) : (
                            // Admin or Fallback
                            <>
                                <div className="w-[50px] h-[50px] flex items-center justify-center text-2xl">⚡️</div>
                                <span className="text-xl font-bold">Admin</span>
                            </>
                        )}
                    </div>

                    {/* Date Picker (Role Check inside) */}
                    <div className="flex flex-col items-center md:items-start gap-1">
                        <h1 className="text-sm font-bold text-gray-400">날짜 설정</h1>
                        {role === 'admin' || role ? (
                            <div className="flex items-center gap-1 text-sm bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                                <select value={startMonth} onChange={e => setStartMonth(e.target.value)} className="bg-transparent font-bold text-gray-700 outline-none text-right appearance-none cursor-pointer hover:text-pink-500">
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <span className="text-gray-400">.</span>
                                <select value={startDay} onChange={e => setStartDay(e.target.value)} className="bg-transparent font-bold text-gray-700 outline-none appearance-none cursor-pointer hover:text-pink-500">
                                    {dates.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <span className="mx-2 text-gray-300">~</span>
                                <select value={endMonth} onChange={e => setEndMonth(e.target.value)} className="bg-transparent font-bold text-gray-700 outline-none text-right appearance-none cursor-pointer hover:text-pink-500">
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <span className="text-gray-400">.</span>
                                <select value={endDay} onChange={e => setEndDay(e.target.value)} className="bg-transparent font-bold text-gray-700 outline-none appearance-none cursor-pointer hover:text-pink-500">
                                    {dates.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        ) : (
                            <span className="text-xs text-gray-300">오늘도 화이팅! 🍀</span>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 md:flex-none bg-blue-500 text-white px-6 py-3 md:py-2 rounded-2xl hover:bg-blue-600 disabled:bg-gray-300 font-medium shadow-md transition-all transform hover:-translate-y-0.5 text-center"
                    >
                        {isSaving ? '⏳' : '저장하기'}
                    </button>
                    <button onClick={handleLogout} className="flex-1 md:flex-none bg-gray-100 text-gray-600 px-6 py-3 md:py-2 rounded-2xl hover:bg-gray-200 font-medium transition-colors text-center">
                        로그아웃
                    </button>
                </div>
            </div>

            {/* Member Selector (Admin Only) */}
            {role === 'admin' && (
                <div className="w-full max-w-[1200px] mb-4 flex justify-end relative z-10 flex-shrink-0">
                    <div className="relative">
                        <button
                            onClick={() => setIsMemberMenuOpen(!isMemberMenuOpen)}
                            className="bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3 hover:bg-gray-50 transition-colors"
                        >
                            {selectedMember ? (
                                <img
                                    src={`/api/proxy/image?url=${encodeURIComponent(selectedMember.avatarUrl)}`}
                                    alt=""
                                    className="w-8 h-8 rounded-full bg-gray-100 object-cover"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">ALL</div>
                            )}
                            <span className="font-bold text-gray-700 text-sm">{selectedMember ? selectedMember.name : '전체 멤버'}</span>
                            <span className="text-gray-400 text-xs">▼</span>
                        </button>

                        {isMemberMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-48 py-2">
                                <div
                                    onClick={() => { setFilterMemberId(null); setIsMemberMenuOpen(false); }}
                                    className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">ALL</div>
                                    <span className="font-bold text-gray-700 text-sm">전체 멤버</span>
                                </div>
                                {editSchedule.characters.map(char => (
                                    <div
                                        key={char.id}
                                        onClick={() => { setFilterMemberId(char.id); setIsMemberMenuOpen(false); }}
                                        className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors border-t border-gray-50"
                                    >
                                        <img
                                            src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`}
                                            alt=""
                                            className="w-8 h-8 rounded-full bg-gray-100 object-cover"
                                        />
                                        <span className="font-bold text-gray-700 text-sm">{char.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mobile Day Navigation - REMOVED */}
            {/* ... */}

            {/* Main Grid Container */}
            <div className="w-full max-w-[1200px] bg-white rounded-[20px] shadow-[0_4px_20px_rgba(255,182,193,0.3)] px-4 pt-4 md:px-6 md:pt-6 pb-0 flex-1 min-h-0 overflow-y-auto">
                <div
                    className={`flex flex-col md:grid gap-[10px] min-h-full pb-4 md:pb-6 ${showProfileCol ? 'md:grid-cols-[100px_repeat(7,minmax(120px,1fr))]' : 'md:grid-cols-7'}`}
                >
                    {/* Desktop Grid Columns Utility */}
                    <div className="hidden md:contents">
                        {showProfileCol && <div className="rounded-[20px]"></div>}
                        {days.map((day) => (
                            <div key={day} className="text-center font-bold text-[#888] p-[10px] bg-[#ffebee] rounded-[10px] text-sm flex items-center justify-center">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Character Rows */}
                    {visibleCharacters.map(char => (
                        <div key={char.id} className="contents md:contents block"> {/* contents for Grid, block for Mobile Stack */}

                            {showProfileCol && (
                                <div
                                    className="hidden md:flex flex-col items-center justify-center p-[10px] rounded-[20px] border-2 transition-colors h-full"
                                    style={{
                                        backgroundColor: getThemeStyles(char.colorTheme).bg,
                                        borderColor: getThemeStyles(char.colorTheme).border,
                                        color: getThemeStyles(char.colorTheme).text
                                    }}
                                >
                                    <img src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`} alt="" className="w-[50px] h-[50px] rounded-full bg-white object-cover mb-1" />
                                    <span className="text-sm font-bold">{char.name}</span>
                                </div>
                            )}

                            {/* Day Cells Loop */}
                            {days.map((day, index) => {
                                const item = char.schedule[day];
                                const type = item?.type || 'stream';
                                const style = getInputStyles(char.colorTheme, type);

                                return (
                                    <div key={day} className="flex flex-col md:block w-full">
                                        {/* Mobile Day Header (Action Badge style) */}
                                        <div className="md:hidden mb-2 px-2 mt-4 flex items-center">
                                            <span className="bg-gray-100 text-gray-500 font-bold px-3 py-1 rounded-full text-xs border border-gray-200">
                                                {day}
                                            </span>
                                            <div className="h-[1px] bg-gray-100 flex-grow ml-3"></div>
                                        </div>

                                        <div
                                            className="p-[10px] rounded-[20px] min-h-[120px] md:min-h-[80px] flex flex-col border-2 transition-transform bg-white w-full"
                                            style={{
                                                borderColor: style.borderColor,
                                                color: style.color,
                                                backgroundColor: style.backgroundColor
                                            }}
                                        >
                                            <input
                                                value={item?.time || ''}
                                                onChange={(e) => updateDay(char.id, day, 'time', e.target.value)}
                                                onBlur={(e) => handleTimeBlur(char.id, day, e.target.value)}
                                                placeholder="Time"
                                                className="bg-transparent font-bold text-[1.1rem] mb-[5px] w-full focus:outline-none placeholder-gray-400/50"
                                                style={{ color: 'inherit' }}
                                            />
                                            <textarea
                                                value={item?.content || ''}
                                                onChange={(e) => updateDay(char.id, day, 'content', e.target.value)}
                                                placeholder="방송 콘텐츠"
                                                className="bg-transparent text-[0.9rem] w-full resize-none min-h-[60px] md:h-full focus:outline-none leading-snug placeholder-gray-400/50 flex-grow"
                                                style={{ color: 'inherit' }}
                                            />
                                            {/* Full Width Type Selector with Korean Options */}
                                            <div className="mt-auto pt-2 w-full">
                                                <select
                                                    value={type}
                                                    onChange={(e) => updateDay(char.id, day, 'type', e.target.value)}
                                                    className="w-full text-[0.8rem] bg-black/5 text-gray-500 rounded px-2 py-1 border-none focus:outline-none cursor-pointer"
                                                    style={{ textAlignLast: 'center' }}
                                                >
                                                    <option value="stream">방송</option>
                                                    <option value="off">휴방</option>
                                                    <option value="collab">합방</option>
                                                    <option value="collab_maivi">메이비</option>
                                                    <option value="collab_hanavi">하나비</option>
                                                    <option value="collab_universe">유니버스</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {/* Style Block for Desktop Grid */}
                    <style jsx>{`
                        @media (min-width: 768px) {
                            .grid {
                                display: grid;
                                grid-template-columns: 100px repeat(7, minmax(120px, 1fr));
                            }
                        }
                    `}</style>
                </div>
            </div>

            <p className="mt-8 text-gray-400 text-sm">
                💡 팁: 내용은 자동으로 줄바꿈됩니다. 휴방으로 설정하면 배경이 하얗게 변합니다.
            </p>
        </div>
    );
}
