"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, Suspense, useState } from "react";
import { usersApi } from "@/lib/api";

const GoogleCalendarCallbackContent = () => {
 const router = useRouter();
 const searchParams = useSearchParams();
 const isProcessingRef = useRef(false);
 const [message, setMessage] = useState("Connecting Google Calendar…");

 useEffect(() => {
 const saveAndRedirect = async () => {
 if (isProcessingRef.current) return;
 if (!searchParams) return;
 isProcessingRef.current = true;

 const oauthError = searchParams.get("error");
 if (oauthError) {
 setMessage("Google Calendar connection was cancelled.");
 window.setTimeout(() => router.replace("/profile"), 900);
 return;
 }

 const code = searchParams.get("code");
 if (!code) {
 setMessage("Missing Google authorization code. Please try connecting again.");
 return;
 }

 try {
 await usersApi.saveGoogleCalendar({ code });
 setMessage("Google Calendar connected. Redirecting…");
 window.setTimeout(() => router.replace("/profile"), 700);
 } catch (error) {
 console.error("Failed to connect Google Calendar:", error);
 setMessage("Failed to connect Google Calendar. Check configuration and try again.");
 }
 };

 saveAndRedirect();
 }, [searchParams, router]);

 return (
 <div className="page">
 <div className="card" style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
 <h1 className="page-title" style={{ fontSize: 28, marginBottom: 12 }}>
 Google Calendar
 </h1>
 <p style={{ color: "var(--tn-fg-muted)", lineHeight: 1.6 }}>{message}</p>
 </div>
 </div>
 );
};

const GoogleCalendarCallback = () => {
 return (
 <Suspense fallback={<div className="page">Loading…</div>}>
 <GoogleCalendarCallbackContent />
 </Suspense>
 );
};

export default GoogleCalendarCallback;
