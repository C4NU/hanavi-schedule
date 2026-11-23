interface CimeVod {
    id?: string;
    state?: string;
    liveOpenedAt?: string;
    category?: { name?: string };
}

interface CimeVodPage {
    args?: [{ bodyData?: { vodData?: { section?: { items?: CimeVod[] } } } }];
}

export function readCimeReplays(html: string) {
    // 씨미 HTML에 문자열로 포함된 JSON만 해석한다.
    for (const script of html.matchAll(/\.push\(JSON\.parse\('((?:\\[\s\S]|[^'\\])*)'\)\)/g)) {
        const literal = script[1].replace(/\\'|\\[\s\S]|"/g, token => (
            token === "\\'" ? "'" : token === '"' ? '\\"' : token
        ));
        const page: CimeVodPage = JSON.parse(JSON.parse(`"${literal}"`));
        const items = page.args?.[0]?.bodyData?.vodData?.section?.items;
        if (!Array.isArray(items)) continue;

        const seenIds = new Set<string>();
        const seenBroadcasts = new Set<number>();
        return items.flatMap(item => {
            const broadcastAt = Date.parse(item.liveOpenedAt ?? '');
            if (!item.id || !/^\d+$/.test(item.id) || item.state !== 'ACTIVE' || !Number.isFinite(broadcastAt)
                || seenIds.has(item.id) || seenBroadcasts.has(broadcastAt)) return [];
            seenIds.add(item.id);
            seenBroadcasts.add(broadcastAt);
            return [{ id: item.id, broadcastAt, category: item.category?.name ?? null }];
        });
    }
    throw new Error('씨미 다시보기 목록 형식이 변경됐습니다.');
}
