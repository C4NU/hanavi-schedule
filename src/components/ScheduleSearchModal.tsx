"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import BaseModal from './BaseModal';
import controls from './ScheduleHeader.module.css';
import { SEARCH_QUERY_LIMIT, type ScheduleSearchResult } from '@/utils/scheduleSearch';

type SearchResponse = { results: ScheduleSearchResult[]; hasMore: boolean };
type SearchState = SearchResponse | 'loading' | 'error' | null;

export default function ScheduleSearchModal({ onClose, onSelect }: {
    onClose: () => void;
    onSelect: (result: ScheduleSearchResult) => void;
}) {
    const [query, setQuery] = useState('');
    const [state, setState] = useState<SearchState>(null);
    const pending = useRef<AbortController | null>(null);
    useEffect(() => () => pending.current?.abort(), []);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const text = query.trim();
        if (!text) return;
        pending.current?.abort();
        const controller = new AbortController();
        pending.current = controller;
        setState('loading');
        try {
            const response = await fetch(`/api/schedule/search?q=${encodeURIComponent(text)}`, {
                signal: controller.signal,
                cache: 'no-store',
            });
            if (!response.ok) throw new Error('Schedule search failed');
            const result: SearchResponse = await response.json();
            if (!controller.signal.aborted) setState(result);
        } catch {
            if (!controller.signal.aborted) setState('error');
        }
    };

    return (
        <BaseModal isOpen onClose={onClose} title="지난 시간표 검색" maxWidth="480px" variant="sheet">
            <form onSubmit={submit} role="search" className="flex items-center gap-2">
                <input
                    type="search"
                    aria-label="방송 제목 또는 게임명"
                    placeholder="방송 제목 또는 게임명"
                    maxLength={SEARCH_QUERY_LIMIT}
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    className="min-w-0 flex-1 rounded-full border border-[var(--control-border)] px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-[var(--control-focus)]"
                    autoFocus
                />
                <button type="submit" className={controls.button} disabled={!query.trim()}>검색</button>
            </form>
            <div aria-live="polite" className="mt-3 text-sm text-stone-700">
                {state === 'loading' && <p>지난 일정을 검색하고 있어요.</p>}
                {state === 'error' && <p>시간표 검색을 불러오지 못했어요. 다시 시도해 주세요.</p>}
                {state && typeof state === 'object' && (
                    state.results.length ? (
                        <>
                            <ul className="grid gap-1">
                                {state.results.map(result => (
                                    <li key={result.id}>
                                        <button
                                            type="button"
                                            onClick={() => onSelect(result)}
                                            className="grid w-full gap-1 rounded-2xl px-3 py-2 text-left hover:bg-[var(--control-hover)] focus-visible:outline-2 focus-visible:outline-[var(--control-focus)]"
                                        >
                                            <strong className="break-words">{result.title}</strong>
                                            <span>{result.date.replaceAll('-', '.')} · {result.members.join(' · ')}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {state.hasMore && <p className="mt-2">최근 결과 40개를 표시했어요. 더 구체적인 검색어로 찾아보세요.</p>}
                        </>
                    ) : <p>일치하는 방송이 없어요.</p>
                )}
            </div>
        </BaseModal>
    );
}
