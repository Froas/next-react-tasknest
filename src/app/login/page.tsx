"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import Link from 'next/link';


interface SignInFormInputs {
 username: string;
 password: string;
}

const signInSchema = yup.object().shape({
 username: yup.string().min(4,"Username must contain at least 4 characters").required("Username is required"),
 password: yup.string().min(6,"Password should be longer than 6 symbols").required("Password is required"),
});

const SignIn = () => {
 const [errorMessage, setErrorMessage] = useState<string | null>(null);
 const router = useRouter();
 const searchParams = useSearchParams();
 const expired = searchParams?.get('expired');
 const redirect = searchParams?.get('redirect');

 const {
 register,
 handleSubmit,
 formState: { errors },
 } = useForm<SignInFormInputs>({
 resolver: yupResolver(signInSchema),
 });

 const onSubmit = async (data: SignInFormInputs) => {
 const result = await signIn("credentials", {
 redirect: false,
 username: data.username,
 password: data.password,
 });

 if (result?.error) {
 setErrorMessage("Incorrect username or password. Create an account first if you have not signed up yet.");
 } else {
 // Only follow same-origin paths from ?redirect= to avoid open-redirect.
 const safeRedirect = redirect && redirect.startsWith('/') && !redirect.startsWith('//')
 ? redirect
 : '/';
 router.push(safeRedirect);
 }
 };

 return (
 <main className="auth-shell">
 <section className="auth-card" aria-labelledby="login-title">
 <div>
 <div id="login-title" className="auth-title" role="heading" aria-level={1}>
 Log In
 </div>
 {expired && (
 <div className="auth-notice" role="status" aria-live="polite">
 <p className="auth-notice-title">
 Session Expired
 </p>
 <p className="auth-notice-body">
 Your session has expired. Please sign in again to continue.
 </p>
 </div>
 )}
 </div>
 <form method="post" onSubmit={handleSubmit(onSubmit)} className="auth-form">
 <div className="auth-field">
 <label className="auth-label" htmlFor="username">Username</label>
 <input className="auth-input" id="username" type="text" autoComplete="username" {...register("username")} placeholder="Enter your username" />
 {errors.username && <p className="auth-error">{errors.username.message}</p>}
 </div>
 <div className="auth-field">
 <label className="auth-label" htmlFor="password">Password</label>
 <input className="auth-input" id="password" type="password" autoComplete="current-password" {...register("password")} placeholder="Enter your password" />
 {errors.password && <p className="auth-error">{errors.password.message}</p>}
 </div>
 {errorMessage && <p className="auth-error">{errorMessage}</p>}
 <button type="submit" className="auth-button">
 Sign In
 </button>
 </form>
 <div className="auth-footer">
 <span>Don't have an account?</span>
 <Link className="auth-link" href={'/signup'}>
 Sign up
 </Link>
 </div>
 </section>
 </main>
 );
};

// useSearchParams forces dynamic rendering; wrap in Suspense so the page
// can still be statically prerendered for the loading shell.
const LoginPage = () => (
 <Suspense fallback={<div className="auth-shell">Loading...</div>}>
 <SignIn />
 </Suspense>
);

export default LoginPage;
