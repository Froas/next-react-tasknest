"use client";

import { useRouter } from "next/navigation";
import { ComponentType, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton"
import { useAppSession } from "../app/clientwrapper";


export function  withAuth<T extends JSX.IntrinsicAttributes>(WrappedComponent: ComponentType<T>) {
    return function  AuthComponent(props: T) {
        const session = useAppSession();
        const router = useRouter();

        useEffect(() => {
            if (!session) {
                router.push('/login')
            }
        }, [session]);

        if (session === undefined) {
            return <Skeleton className="h-4 w-[250px]" />
        }

        if (!session) {
            return <p>Redirect to login...</p>;
        }

        return <WrappedComponent {...props} />;
    }
}