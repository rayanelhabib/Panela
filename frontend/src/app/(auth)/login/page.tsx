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

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [globalError, setGlobalError] = useState("");

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
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setGlobalError("");
      const response = await api.post("/auth/login", data);
      
      if (response.data?.data?.token) {
        localStorage.setItem("panella_token", response.data.data.token);
        router.push("/dashboard");
      }
    } catch (error: any) {
      setGlobalError(error.response?.data?.error || "Failed to log in. Please check your credentials.");
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-1 text-center">
        <h2 className="text-xl font-normal text-[#f4f4f4]">Log in</h2>
        <p className="text-xs text-[#c6c6c6]">Enter your cloud credentials to manage deployments</p>
      </div>

      {globalError && (
        <div className="p-3 bg-[#da1e28]/10 border border-[#da1e28]/20 text-[#da1e28] text-xs text-center">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="admin@panella.com"
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
          Sign In
        </Button>
      </form>

      <div className="text-center text-xs text-[#c6c6c6]">
        Don't have an account?{" "}
        <Link href="/register" className="text-[#0f62fe] hover:underline font-normal">
          Create one now
        </Link>
      </div>
    </div>
  );
}
