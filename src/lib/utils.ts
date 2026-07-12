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

const padDatePart = (value: number): string => String(value).padStart(2, '0');

const formatLocalDate = (date: Date): string =>
 `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const formatLocalDateTime = (date: Date): string =>
 `${formatLocalDate(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;

const parseDateInputValue = (value: string): Date => {
 if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
 const [year, month, day] = value.split('-').map(Number);
 return new Date(year, month - 1, day);
 }
 return new Date(value);
};

export const toOptionalDateInput = (iso?: string | null): string => {
 if (!iso) return '';
 const date = parseDateInputValue(iso);
 if (Number.isNaN(date.getTime())) return '';
 return formatLocalDate(date);
};

// Format an ISO datetime string for an <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
// Returns"now" (rounded to current minute) when the input is missing/unparseable.
export const toDateTimeInput = (iso?: string): string => {
 const date = iso ? parseDateInputValue(iso) : new Date();
 const safe = Number.isNaN(date.getTime()) ? new Date() : date;
 return formatLocalDateTime(safe);
};

export const toOptionalDateTimeInput = (iso?: string | null): string => {
 if (!iso) return '';
 const date = parseDateInputValue(iso);
 if (Number.isNaN(date.getTime())) return '';
 return formatLocalDateTime(date);
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
