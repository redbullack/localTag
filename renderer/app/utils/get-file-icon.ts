/** 확장자별 파일 아이콘 매핑 */
const ICON_MAP: Record<string, string> = {
    pdf: '📕',
    doc: '📘',
    docx: '📘',
    txt: '📝',
    xls: '📗',
    xlsx: '📗',
    csv: '📗',
    ppt: '📙',
    pptx: '📙',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    svg: '🖼️',
    webp: '🖼️',
    mp3: '🎵',
    wav: '🎵',
    flac: '🎵',
    mp4: '🎬',
    avi: '🎬',
    mkv: '🎬',
    mov: '🎬',
    zip: '📦',
    rar: '📦',
    '7z': '📦',
    js: '💛',
    ts: '💙',
    py: '🐍',
    java: '☕',
    html: '🌐',
    css: '🎨',
    json: '📋',
};

/** 확장자에 따라 파일 아이콘을 반환한다. */
export const getFileIcon = (extension: string | null): string => {
    if (!extension) return '📄';
    return ICON_MAP[extension.toLowerCase()] || '📄';
};
