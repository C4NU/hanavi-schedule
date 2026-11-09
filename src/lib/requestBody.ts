export class RequestBodyError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
    }
}

export async function readJsonBody(request: Request, maxBytes = 1024 * 1024): Promise<unknown> {
    const reader = request.body?.getReader();
    if (!reader) throw new RequestBodyError(400, 'Invalid request body');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > maxBytes) {
                await reader.cancel();
                throw new RequestBodyError(413, 'Request body too large');
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
    }
    try {
        return JSON.parse(new TextDecoder().decode(body));
    } catch {
        throw new RequestBodyError(400, 'Invalid JSON');
    }
}
