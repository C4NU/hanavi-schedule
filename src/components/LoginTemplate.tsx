import React from 'react';

interface LoginTemplateProps {
    id: string;
    setId: (value: string) => void;
    password: string;
    setPassword: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export default function LoginTemplate({ id, setId, password, setPassword, onSubmit }: LoginTemplateProps) {
    return (
        <div className="flex h-full items-center justify-center bg-gray-50">
            <form onSubmit={onSubmit} className="bg-white p-10 rounded-[20px] shadow-xl w-full max-w-sm border border-gray-100">
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
