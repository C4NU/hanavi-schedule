"use client";

import { useState } from 'react';
import { toast } from 'sonner';

export default function AdminPushPage() {
    const [secret, setSecret] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!secret) {
            alert('Please enter the admin secret');
            return;
        }

        setIsLoading(true);
        setStatus('Sending...');

        try {
            const res = await fetch('/api/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    secret,
                    title: title || undefined,
                    body: body || undefined,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus(`Success: ${data.message}`);
            } else {
                setStatus(`Error: ${data.error}`);
            }
        } catch (error) {
            setStatus('Failed to send request');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">Push Notification Admin</h1>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Admin Secret</label>
                        <input
                            type="password"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Enter secret key"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Default: 하나비 스케줄 업데이트"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Body (Optional)</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                            placeholder="Default: 스케줄이 업데이트되었습니다!"
                        />
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={isLoading}
                        className={`w-full py-3 rounded-lg text-white font-bold transition-colors ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {isLoading ? 'Sending...' : 'Send Push Notification'}
                    </button>

                    {status && (
                        <div className={`mt-4 p-3 rounded-lg text-sm ${status.startsWith('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {status}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
