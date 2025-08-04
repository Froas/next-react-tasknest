"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input"; 
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from 'next/link';


interface SignInFormInputs {
  username: string;
  password: string;
}

const signInSchema = yup.object().shape({
  username: yup.string().min(4,"Incorrect format email").required("Email is required"),
  password: yup.string().min(6, "Password should be longer than 6 symbols").required("Password is required"),
});

const SignIn = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams?.get('expired');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormInputs>({
    resolver: yupResolver(signInSchema),
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit(onSubmit)(); 
    }
  };
  const onSubmit = async (data: SignInFormInputs) => {
    const result = await signIn("credentials", {
      redirect: false,
      username: data.username,
      password: data.password,
    });

    if (result?.error) {
      setErrorMessage("Something went wrong.");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md p-4">
        <CardHeader>
          <CardTitle>Log In</CardTitle>
          {expired && (
            <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Session Expired
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    Your session has expired. Please sign in again to continue.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="email" {...register("username")} placeholder="Enter your username" />
              {errors.username && <p className="text-red-500">{errors.username.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} placeholder="Enter your password"  onKeyDown={handleKeyDown}/>
              {errors.password && <p className="text-red-500">{errors.password.message}</p>}
            </div>
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="submit" onClick={handleSubmit(onSubmit)} className="w-full">Sign In</Button>
        </CardFooter>
        <div className="flex justify-center items-center space-x-2">
          <Label>Don't have an account?</Label>
          <Link href={'/signup'}>
            <Label className="text-blue-800"> Sign up</Label>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default SignIn;
