"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ComponentType, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton"


export function  withAuth<T extends JSX.IntrinsicAttributes>(WrappedComponent: ComponentType<T>) {
    return function  AuthComponent(props: T) {
        const { data: session, status } = useSession();
        const router = useRouter();

        useEffect(() => {
            if (status === 'unauthenticated') {
                router.push('/login')
            }
        } ,[status])

        if (status === 'loading') {
            return <Skeleton className="h-4 w-[250px]" />
        }

       
        if (!session) {
            return <p>Перенаправляем на вход...</p>;
        }

     
        return <WrappedComponent {...props} />;
    }
}