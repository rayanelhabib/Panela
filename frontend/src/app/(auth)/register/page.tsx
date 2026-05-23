"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(32, "Username is too long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [globalError, setGlobalError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("panella_token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setGlobalError("");
      await api.post("/auth/register", data);
      setIsSuccess(true);
      
      setTimeout(() => {
        router.push("/login");
      }, 2000);
      
    } catch (error: any) {
      setGlobalError(error.response?.data?.error || "Failed to create account. Please try again.");
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col space-y-4 text-center py-8">
        <div className="w-12 h-12 bg-[#24a148]/20 text-[#24a148] flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-xl font-normal text-[#f4f4f4]">Account provisioned!</h2>
        <p className="text-xs text-[#c6c6c6]">Redirecting you to login portal...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-1 text-center">
        <h2 className="text-xl font-normal text-[#f4f4f4]">Create account</h2>
        <p className="text-xs text-[#c6c6c6]">Provision your client credentials and manage clusters</p>
      </div>

      {globalError && (
        <div className="p-3 bg-[#da1e28]/10 border border-[#da1e28]/20 text-[#da1e28] text-xs text-center">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Username"
          type="text"
          placeholder="johndoe"
          {...register("username")}
          error={errors.username?.message}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="john@example.com"
          {...register("email")}
          error={errors.email?.message}
        />
        
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
          error={errors.password?.message}
        />

        <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
          Create Account
        </Button>
      </form>

      <div className="text-center text-xs text-[#c6c6c6]">
        Already have an account?{" "}
        <Link href="/login" className="text-[#0f62fe] hover:underline font-normal">
          Sign in
        </Link>
      </div>
    </div>
  );
}
