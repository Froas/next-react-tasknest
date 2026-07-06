'use client';

import { useEffect } from 'react';

// Client-side document title helper. Pages that are `'use client'` can't
// export Next.js `metadata`, so we update `document.title` directly.
// Format mirrors the layout-level template: `${title} · TaskNest`.
export const useDocumentTitle = (title: string | null | undefined) => {
 useEffect(() => {
 if (typeof document === 'undefined') return;
 const previous = document.title;
 if (title) {
 document.title = `${title} · TaskNest`;
 }
 return () => {
 document.title = previous;
 };
 }, [title]);
};
