"use client";

import { useCallback, useMemo } from 'react';
import { WebHaptics, defaultPatterns } from 'web-haptics';

export const useHaptics = () => {
    // Initialize WebHaptics only once
    const haptics = useMemo(() => {
        if (typeof window !== 'undefined') {
            return new WebHaptics();
        }
        return null;
    }, []);

    const trigger = useCallback((pattern?: any) => {
        if (haptics) {
            try {
                haptics.trigger(pattern);
            } catch (error) {
                console.warn('Haptic feedback not supported or failed:', error);
            }
        }
    }, [haptics]);

    return {
        trigger,
        patterns: defaultPatterns
    };
};
