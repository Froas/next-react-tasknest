"use client";

import { useRouter } from "next/navigation";
import { ComponentType, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";

export function withAuth<T extends JSX.IntrinsicAttributes>(WrappedComponent: ComponentType<T>) {
 return function AuthComponent(props: T) {
 const { data: session, status } = useSession();
 const router = useRouter();

 useEffect(() => {
 if (status === 'unauthenticated') {
 router.push('/login');
 }
 }, [status, router]);

 if (status === 'loading') {
 return <Skeleton className="h-4 w-[250px]" />;
 }

 if (status === 'unauthenticated' || !session) {
 return <p>Redirect to login...</p>;
 }

 return <WrappedComponent {...props} />;
 };
}