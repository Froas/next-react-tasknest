import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from '@/context/ThemeContext';
import { DesignThemeProvider } from '@/context/DesignThemeContext';
import ClientWrapper from './clientwrapper';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { HelpOverlay } from '@/components/ui/HelpOverlay';

const geistSans = localFont({
 src:"./fonts/GeistVF.woff",
 variable:"--font-geist-sans",
 weight:"100 900",
});
const geistMono = localFont({
 src:"./fonts/GeistMonoVF.woff",
 variable:"--font-geist-mono",
 weight:"100 900",
});

export const metadata: Metadata = {
 title: {
 default:"TaskNest",
 template:"%s · TaskNest",
 },
 description:"Goal-based roadmap manager: turn ambitions into milestones, tasks, and daily action.",
 manifest:"/manifest.webmanifest",
 appleWebApp: {
 capable: true,
 statusBarStyle:"default",
 title:"TaskNest",
 },
 icons: {
 icon: [
 { url:"/icon.svg", type:"image/svg+xml" },
 { url:"/favicon.ico", sizes:"48x48" },
 ],
 apple:"/icon.svg",
 },
};

export const viewport = {
 themeColor:"#1f2937",
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
 
}>) {

 return (
 <html lang="en">
 <head>
 {/*
 Combined Google Fonts for all 13 design themes. Each theme's
 `--tn-font-*` variables reference these by family name; the link
 below makes the browser actually fetch them. Themes that don't
 need a particular family simply don't reference it, so unused
 weights cost nothing once cached. We use a single `<link>` (not
 13 separate next/font imports) because next/font with 13 families
 bloats the bundle. `display=swap` ensures system fallback shows
 instantly while Google Fonts load in the background.
 */}
 <link rel="preconnect" href="https://fonts.googleapis.com" />
 <link
 rel="preconnect"
 href="https://fonts.gstatic.com"
 crossOrigin="anonymous"
 />
 <link
 rel="stylesheet"
 href={
 'https://fonts.googleapis.com/css2' +
 '?family=Archivo+Black' +
 '&family=Caveat:wght@500;700' +
 '&family=Cinzel:wght@500;700' +
 '&family=Crimson+Pro:wght@400;500;600' +
 '&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600' +
 '&family=Geist+Mono:wght@400;500;700;900' +
 '&family=Inter:wght@380;400;420;500;600;700;800' +
 '&family=Instrument+Serif:ital@0;1' +
 '&family=JetBrains+Mono:wght@400;500;600;700' +
 '&family=Kalam:wght@400;700' +
 '&family=Patrick+Hand' +
 '&family=Press+Start+2P' +
 '&family=Space+Grotesk:wght@400;500;600;700' +
 '&family=VT323' +
 '&display=swap'
 }
 />
 </head>
 <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} >
 <ThemeProvider>
 <DesignThemeProvider>
 <ClientWrapper>
 <ErrorBoundary>{children}</ErrorBoundary>
 <RefreshIndicator />
 <CommandPalette />
 <HelpOverlay />
 <ToastViewport />
 </ClientWrapper>
 </DesignThemeProvider>
 </ThemeProvider>
 </body>
 </html>
 );
}
