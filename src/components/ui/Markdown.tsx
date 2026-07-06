import React from 'react';

// Tiny safe-by-default markdown renderer. Intentionally minimal so we don't
// pull a dependency for ~80 lines of well-scoped logic. Supports:
// • **bold**, *italic*, `code`
// • [text](https://url) links (only http/https/mailto)
// • Auto-link bare http/https URLs
// • Bulleted lists ("-" or"*" prefix)
// • Paragraph breaks on blank lines
// Anything HTML-ish is escaped first to neutralise XSS.

const escapeHtml = (s: string) =>
 s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SAFE_PROTOCOLS = /^(https?:|mailto:)/i;

const renderInline = (raw: string): string => {
 let s = escapeHtml(raw);
 // `code`
 s = s.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-muted dark:bg-card rounded text-xs">$1</code>');
 // **bold**
 s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
 // *italic* (avoid eating already-replaced bold tokens by requiring boundary)
 s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
 // [text](url) — only safe protocols.
 s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) =>
 SAFE_PROTOCOLS.test(url)
 ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">${text}</a>`
 : escapeHtml(`[${text}](${url})`)
 );
 // Auto-link bare URLs we didn't already wrap.
 s = s.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, (_m, lead, url) =>
 `${lead}<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">${url}</a>`
 );
 return s;
};

interface MarkdownProps {
 source: string | null | undefined;
 className?: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ source, className = '' }) => {
 if (!source) return null;
 const blocks: { kind: 'p' | 'ul'; lines: string[] }[] = [];
 const rawLines = source.split('\n');

 let buffer: string[] = [];
 let mode: 'p' | 'ul' | null = null;

 const flush = () => {
 if (mode && buffer.length > 0) blocks.push({ kind: mode, lines: buffer });
 buffer = [];
 mode = null;
 };

 for (const line of rawLines) {
 const isBullet = /^\s*[-*+]\s+/.test(line);
 if (line.trim() === '') {
 flush();
 continue;
 }
 if (isBullet) {
 if (mode !== 'ul') flush();
 mode = 'ul';
 buffer.push(line.replace(/^\s*[-*+]\s+/, ''));
 } else {
 if (mode !== 'p') flush();
 mode = 'p';
 buffer.push(line);
 }
 }
 flush();

 return (
 <div className={`space-y-2 ${className}`}>
 {blocks.map((block, idx) => {
 if (block.kind === 'ul') {
 return (
 <ul key={idx} className="list-disc list-inside space-y-1">
 {block.lines.map((line, j) => (
 <li
 key={j}
 // eslint-disable-next-line react/no-danger
 dangerouslySetInnerHTML={{ __html: renderInline(line) }}
 />
 ))}
 </ul>
 );
 }
 return (
 <p
 key={idx}
 // eslint-disable-next-line react/no-danger
 dangerouslySetInnerHTML={{ __html: block.lines.map(renderInline).join('<br/>') }}
 />
 );
 })}
 </div>
 );
};
