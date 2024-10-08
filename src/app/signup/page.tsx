"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import { useState } from "react";
import { Input } from "@/components/ui/input"; // Компоненты Shadcn
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
  email: yup.string().email("Неверный формат email").required("Email обязателен"),
  username: yup.string().min(4, 'Incorrect username').required("Username should be more than 4 symbols"),
  password_hash: yup.string().min(6, "Пароль должен быть не менее 6 символов").required("Пароль обязателен"),
});

const SignUp = () => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormInputs>({
    resolver: yupResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormInputs) => {
    try {
      const response = await axios.post("http://localhost:8000/users", data); 
      setSuccessMessage("Регистрация прошла успешно!");
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage("Произошла ошибка при регистрации.");
      setSuccessMessage(null);
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
              <Input id="email" type="email" {...register("email")} placeholder="Введите ваш email" />
              {errors.email && <p className="text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="username" {...register("username")} placeholder="Введите ваш username" />
              {errors.email && <p className="text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password_hash")} placeholder="Введите пароль" />
              {errors.password_hash && <p className="text-red-500">{errors.password_hash.message}</p>}
            </div>
            {successMessage && <p className="text-green-500">{successMessage}</p>}
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="submit" onClick={handleSubmit(onSubmit)} className="w-full">Sign Up</Button>
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
