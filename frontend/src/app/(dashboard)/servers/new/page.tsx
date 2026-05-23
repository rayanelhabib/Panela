"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BareMetalServer, Chip, BlockStorage, DataBase, ArrowLeft } from "@carbon/icons-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const createServerSchema = z.object({
  name: z.string().min(3, "Server name must be at least 3 characters").max(50, "Name too long"),
  cpu_limit: z.coerce.number().min(1, "Minimum 1 vCore").max(16, "Maximum 16 vCores"),
  memory_limit: z.coerce.number().min(512, "Minimum 512 MB").max(32768, "Maximum 32GB"),
  disk_limit: z.coerce.number().min(1024, "Minimum 1 GB").max(102400, "Maximum 100GB"),
});

type FormValues = z.infer<typeof createServerSchema>;

export default function CreateServerPage() {
  const router = useRouter();
  const [globalError, setGlobalError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(createServerSchema) as any,
    defaultValues: {
      cpu_limit: 2,
      memory_limit: 2048,
      disk_limit: 10240,
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setGlobalError("");
      const response = await api.post("/servers", data);
      
      if (response.data?.data?.id) {
        router.push(`/servers/${response.data.data.id}`);
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      setGlobalError(error.response?.data?.error || "Failed to create server");
    }
  };

  const cpuVal = watch("cpu_limit") || 0;
  const memVal = watch("memory_limit") || 0;
  const diskVal = watch("disk_limit") || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-[#393939] transition-colors">
          <ArrowLeft size={20} className="text-[#c6c6c6]" />
        </Link>
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-[#f4f4f4] mb-1">Provision instance</h1>
          <p className="text-[14px] text-[#c6c6c6]">Configure your virtual hardware resources and deployment options.</p>
        </div>
      </div>

      {globalError && (
        <div className="p-4 bg-[#da1e28]/10 border border-[#da1e28]/20 text-[#da1e28] text-[14px]">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="carbon-panel p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-[#393939] flex items-center justify-center text-[#f4f4f4]">
              <BareMetalServer size={18} />
            </div>
            <h2 className="text-[18px] font-semibold text-[#f4f4f4]">General Specifications</h2>
          </div>
          
          <Input
            label="Instance Identifier / Name"
            placeholder="e.g. production-us-east-01"
            {...register("name")}
            error={errors.name?.message}
          />
        </div>

        <div className="carbon-panel p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-[#393939] flex items-center justify-center text-[#f4f4f4]">
              <Chip size={18} />
            </div>
            <h2 className="text-[18px] font-semibold text-[#f4f4f4]">Hardware Allocations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[12px] font-normal text-[#c6c6c6]">CPU Cores</label>
                <span className="text-[11px] font-mono text-[#0f62fe] bg-[#0f62fe]/10 px-2 py-0.5">{cpuVal} Cores</span>
              </div>
              <Input
                type="number"
                {...register("cpu_limit")}
                error={errors.cpu_limit?.message}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[12px] font-normal text-[#c6c6c6]">Memory (MB)</label>
                <span className="text-[11px] font-mono text-[#0f62fe] bg-[#0f62fe]/10 px-2 py-0.5">{(memVal / 1024).toFixed(1)} GB</span>
              </div>
              <Input
                type="number"
                {...register("memory_limit")}
                error={errors.memory_limit?.message}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[12px] font-normal text-[#c6c6c6]">Storage (MB)</label>
                <span className="text-[11px] font-mono text-[#0f62fe] bg-[#0f62fe]/10 px-2 py-0.5">{(diskVal / 1024).toFixed(1)} GB</span>
              </div>
              <Input
                type="number"
                {...register("disk_limit")}
                error={errors.disk_limit?.message}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link href="/dashboard">
            <Button type="button" variant="secondary" size="lg">Cancel</Button>
          </Link>
          <Button type="submit" size="lg" isLoading={isSubmitting}>
            Provision Server
          </Button>
        </div>
      </form>
    </div>
  );
}
