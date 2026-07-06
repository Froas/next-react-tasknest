import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs))
}

export const formatDate = (dateString: string): string => {
 const date = new Date(dateString);
 return date.toLocaleDateString('en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
};

// Format an ISO datetime string for an <input type="date"> (YYYY-MM-DD).
// Falls back to today when the input is missing or unparseable.
export const toDateInput = (iso?: string): string => {
 if (iso) {
 const date = new Date(iso);
 if (!Number.isNaN(date.getTime())) {
 return date.toISOString().split('T')[0];
 }
 }
 return new Date().toISOString().split('T')[0];
};

// Format an ISO datetime string for an <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
// Returns"now" (rounded to current minute) when the input is missing/unparseable.
export const toDateTimeInput = (iso?: string): string => {
 const date = iso ? new Date(iso) : new Date();
 const safe = Number.isNaN(date.getTime()) ? new Date() : date;
 return safe.toISOString().slice(0, 16);
};

// Strip markdown decoration so card previews show readable plain text. Not
// a full parser — handles only the inline syntax we render in <Markdown>.
export const stripMarkdown = (s: string | null | undefined): string => {
 if (!s) return '';
 return s
 .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // ![alt](url) → alt
 .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
 .replace(/`([^`]+)`/g, '$1') // `code` → code
 .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** → bold
 .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2') // *italic* → italic
 .replace(/^\s*[-*+]\s+/gm, '• ') // bullet markers → bullet char
 .replace(/^\s*\d+[.)]\s+/gm, '') // ordered markers stripped
 .replace(/\n{2,}/g, ' · ') // paragraph breaks → middot
 .replace(/\n/g, ' ')
 .trim();
};
