const MIN_CONTENT_FONT_SIZE = 12;

// 실제 셀 안에서 시간 줄과 패딩을 뺀 높이에 방송 내용을 맞춘다.
export function fitScheduleContent(row: HTMLDivElement) {
    const cell = row.parentElement;
    const timeRow = cell?.firstElementChild;
    const isEditor = row.hasAttribute('data-fit-editor');
    const content = isEditor ? row.querySelector('[contenteditable="true"]') : row.lastElementChild;
    if (!cell?.clientHeight || !timeRow || !(content instanceof HTMLElement)) return;
    if (isEditor && content.contains(document.activeElement)) return;

    row.style.removeProperty('--fitted-content-size');
    row.style.removeProperty('--fitted-line-count');

    const cellStyle = getComputedStyle(cell);
    const timeStyle = getComputedStyle(timeRow);
    const reservedHeight = cell.querySelector(':scope > [data-fit-reserved]')?.getBoundingClientRect().height ?? 0;
    const available = isEditor ? row.clientHeight : cell.clientHeight
        - parseFloat(cellStyle.paddingTop) - parseFloat(cellStyle.paddingBottom)
        - timeRow.getBoundingClientRect().height - parseFloat(timeStyle.marginBottom) - reservedHeight;
    if (available <= 0) return;
    if (content.scrollHeight <= available + 0.5) return;

    const baseSize = parseFloat(getComputedStyle(row).fontSize);
    for (let size = Math.ceil(baseSize) - 1; size >= MIN_CONTENT_FONT_SIZE; size -= 1) {
        row.style.setProperty('--fitted-content-size', `${size}px`);
        if (content.scrollHeight <= available + 0.5) return;
    }

    if (isEditor) return;
    const lineHeight = parseFloat(getComputedStyle(content).lineHeight);
    row.style.setProperty('--fitted-line-count', String(Math.max(1, Math.floor((available + 0.5) / lineHeight))));
}
