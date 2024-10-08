"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const LogoutPage = () => {
  const router = useRouter();

  useEffect(() => {
    signOut({
      redirect: false, 
    }).then(() => {
      router.push("/");
    });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Выход из системы...</p>
    </div>
  );
};

export default LogoutPage;
