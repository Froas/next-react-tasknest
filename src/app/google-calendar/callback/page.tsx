"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, Suspense } from "react";
import { usersApi } from "@/lib/api"; 

const GoogleCalendarCallbackContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const saveAndRedirect = async () => {
    if (searchParams) {
        if (isProcessingRef.current) {
            return;
        }
        const code = searchParams.get("code") ;
        if (code) {
        try {
            isProcessingRef.current = true; 
            await usersApi.saveGoogleCalendar({"code": code});
            router.replace("/");
        } catch (error) {
            router.replace("/error");
        }
        }
    };
    }
    saveAndRedirect();
  }, [searchParams, router]);

  return <div>Integration with Google Calendar</div>;
};

const GoogleCalendarCallback = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GoogleCalendarCallbackContent />
    </Suspense>
  );
};

export default GoogleCalendarCallback;
