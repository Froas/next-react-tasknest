"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Link from 'next/link';

interface SignUpFormInputs {
 email: string;
 username: string;
 password_hash: string;
}

const signUpSchema = yup.object().shape({
 email: yup.string().email("Incorrect format form email").required("Email is required"),
 username: yup.string().min(4, 'Incorrect username').required("Username should be more than 4 symbols"),
 password_hash: yup.string().min(6,"Password should be longer than 6 symbols").required("Password is required"),
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const SignUp = () => {
 const router = useRouter();
 const [successMessage, setSuccessMessage] = useState<string | null>(null);
 const [errorMessage, setErrorMessage] = useState<string | null>(null);
 const [submitting, setSubmitting] = useState(false);

 const {
 register,
 handleSubmit,
 formState: { errors },
 } = useForm<SignUpFormInputs>({
 resolver: yupResolver(signUpSchema),
 });

 const onSubmit = async (data: SignUpFormInputs) => {
 setSubmitting(true);
 try {
 await axios.post(`${API_BASE_URL}/users`, data);
 setSuccessMessage("Account created — signing you in…");
 setErrorMessage(null);

 // Auto sign-in with the same credentials so the user lands in
 // the app instead of having to type them again.
 const result = await signIn("credentials", {
 redirect: false,
 username: data.username,
 password: data.password_hash,
 });
 if (result?.error) {
 // Account exists but auto-login failed (NextAuth misconfig,
 // backend hiccup, etc.). Fall back to /login so the user can
 // try manually — their credentials work, we just can't carry
 // them in.
 router.push("/login");
 return;
 }
 router.push("/");
 } catch (error) {
 // Surface backend detail (e.g."Username already taken") instead of
 // a generic"Something went wrong". 409 = conflict (taken name/email),
 // 422 = validation, anything else = unknown.
 let message ="Something went wrong. Please retry";
 if (axios.isAxiosError(error)) {
 const detail = error.response?.data?.detail;
 if (typeof detail ==="string") {
 message = detail;
 } else if (Array.isArray(detail) && detail[0]?.msg) {
 message = detail.map((d: any) => d.msg).join(",");
 } else if (error.response?.status === 500) {
 // Backend likely hit a UNIQUE constraint (username/email taken)
 // and didn't translate it. Show a useful guess.
 message =
"That username or email is already taken. Try a different one.";
 } else if (!error.response) {
 message ="Can't reach the server. Is the backend running?";
 }
 }
 setErrorMessage(message);
 setSuccessMessage(null);
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div className="flex items-center justify-center min-h-screen">
 <Card className="w-full max-w-md p-4">
 <CardHeader>
 <CardTitle>Sign Up</CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 <div>
 <Label htmlFor="email">Email</Label>
 <Input id="email" type="email" {...register("email")} placeholder="Enter your email" />
 {errors.email && <p className="text-red-500">{errors.email.message}</p>}
 </div>
 <div>
 <Label htmlFor="username">Username</Label>
 <Input id="username" type="text" {...register("username")} placeholder="Enter your username" />
 {errors.username && <p className="text-red-500">{errors.username.message}</p>}
 </div>
 <div>
 <Label htmlFor="password">Password</Label>
 <Input id="password" type="password" {...register("password_hash")} placeholder="Enter your password" />
 {errors.password_hash && <p className="text-red-500">{errors.password_hash.message}</p>}
 </div>
 {successMessage && <p className="text-green-500">{successMessage}</p>}
 {errorMessage && <p className="text-red-500">{errorMessage}</p>}
 </form>
 </CardContent>
 <CardFooter className="flex justify-between">
 <Button type="submit" onClick={handleSubmit(onSubmit)} disabled={submitting} className="w-full">
 {submitting ?"Creating account…" :"Sign Up"}
 </Button>
 </CardFooter>
 <div className="flex justify-center items-center space-x-2">
 <Label>Already have an account?</Label>
 <Link href={'/login'}>
 <Label className="text-blue-800"> Log in</Label>
 </Link>
 </div>
 </Card>
 </div>
 );
};

export default SignUp;
