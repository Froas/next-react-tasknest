"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

const LogoutPage = () => {
 useEffect(() => {
 localStorage.removeItem('access_token');
 signOut({ callbackUrl: '/login' });
 }, []);

 return (
 <div className="flex items-center justify-center min-h-screen">
 <p>Log out from system..</p>
 </div>
 );
};

export default LogoutPage;
