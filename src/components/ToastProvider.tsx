"use client";

import { useEffect, useState } from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export default function ToastProvider() {
    const [position, setPosition] = useState<'bottom-center' | 'top-right'>('bottom-center');

    useEffect(() => {
        const updatePosition = () => {
            if (window.innerWidth >= 768) {
                setPosition('top-right');
            } else {
                setPosition('bottom-center');
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, []);

    return (
        <SonnerToaster 
            position={position} 
            richColors 
            closeButton 
            theme="light"
            toastOptions={{
                style: {
                    borderRadius: '12px',
                    fontFamily: 'inherit',
                },
                className: 'hanavi-toast',
            }}
        />
    );
}
