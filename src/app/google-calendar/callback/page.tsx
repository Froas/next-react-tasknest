"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { usersApi } from "@/lib/api"; 

const GoogleCalendarCallback = () => {
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

export default GoogleCalendarCallback;
