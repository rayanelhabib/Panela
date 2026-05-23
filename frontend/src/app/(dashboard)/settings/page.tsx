"use client";

import React, { useEffect, useState } from "react";
import { User, Key, Save, Image as ImageIcon, Security } from "@carbon/icons-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const profileSchema = z.object({
  username: z.string().min(3).max(32),
  email: z.string().email(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    api.get("/users/me").then(res => {
      if (res.data?.data) {
        reset({
          username: res.data.data.username,
          email: res.data.data.email,
        });
        if (res.data.data.avatar) {
          setAvatarPreview(res.data.data.avatar);
        }
      }
    }).finally(() => setLoading(false));
  }, [reset]);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      const res = await api.put("/users/me", data);
      if (res.data?.data) {
        reset({
          username: res.data.data.username,
          email: res.data.data.email,
        });
      }
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to update profile settings");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await api.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data?.data?.avatar_url) {
        setAvatarPreview(`http://localhost:8080${res.data.data.avatar_url}`);
      }
    } catch (err) {
      console.error("Failed to upload avatar", err);
      alert("Failed to upload avatar");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-[#0f62fe] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="border-b border-[#393939] pb-4">
        <h1 className="text-[28px] font-normal tracking-tight text-[#f4f4f4] mb-1">Account preferences</h1>
        <p className="text-[14px] text-[#c6c6c6]">Manage your profile, credentials, and identity controls.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Profile Form */}
          <div className="carbon-panel p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#393939] flex items-center justify-center text-[#f4f4f4]">
                <User size={18} />
              </div>
              <h2 className="text-[18px] font-semibold text-[#f4f4f4]">Public profile</h2>
            </div>

            {successMsg && (
              <div className="mb-6 p-3 bg-[#24a148]/10 border border-[#24a148]/20 text-[#24a148] text-[13px]">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-4">
              <Input
                label="Username"
                {...register("username")}
                error={errors.username?.message}
              />
              <Input
                label="Email Address"
                type="email"
                {...register("email")}
                error={errors.email?.message}
              />
              <div className="pt-4 flex justify-end">
                <Button type="submit" isLoading={isSubmitting}>
                  Save Changes <Save size={16} className="ml-4" />
                </Button>
              </div>
            </form>
          </div>

          {/* Security Form (Mock) */}
          <div className="carbon-panel p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#393939] flex items-center justify-center text-[#f4f4f4]">
                <Security size={18} />
              </div>
              <h2 className="text-[18px] font-semibold text-[#f4f4f4]">Security settings</h2>
            </div>
            <div className="space-y-4">
              <Input label="Current Password" type="password" placeholder="••••••••" />
              <Input label="New Password" type="password" placeholder="••••••••" />
              <div className="pt-4 flex justify-end">
                <Button variant="secondary">Update Credentials</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="carbon-panel p-6 flex flex-col items-center text-center">
            <h2 className="text-[16px] font-semibold w-full text-left mb-6 text-[#f4f4f4]">Profile Picture</h2>
            
            <div className="w-32 h-32 border-2 border-dashed border-[#525252] bg-[#262626] flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={32} className="text-[#8d8d8d] mb-2" />
              )}
              
              <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="text-[12px] font-semibold text-white">Change Avatar</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/webp" 
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            
            <p className="text-[11px] text-[#c6c6c6] mt-4">
              Allowed formats: JPEG, PNG, WEBP. Max size: 2MB.
              Avatars are served locally.
            </p>
          </div>

          {/* API Keys (Mock) */}
          <div className="carbon-panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#393939] flex items-center justify-center text-[#f4f4f4]">
                <Key size={18} />
              </div>
              <h2 className="text-[16px] font-semibold text-[#f4f4f4]">Access tokens</h2>
            </div>
            <p className="text-[13px] text-[#c6c6c6] mb-4">
              Manage your personal API keys for programmatic access.
            </p>
            <Button variant="secondary" className="w-full justify-center">Manage API Keys</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
