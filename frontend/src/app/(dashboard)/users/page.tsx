"use client";

import React, { useEffect, useState } from "react";
import { User, UserAvatar, Security, Search, OverflowMenuHorizontal } from "@carbon/icons-react";
import { api } from "@/lib/api";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
}

export default function UsersPage() {
  const [me, setMe] = useState<UserProfile | null>(null);

  useEffect(() => {
    api.get("/users/me").then(res => {
      if (res.data?.data) {
        setMe(res.data.data);
      }
    }).catch(console.error);
  }, []);

  const mockUsers: UserProfile[] = [
    { id: "1", username: "admin", email: "admin@panella.com", role: "admin" },
    { id: "2", username: "rayan", email: "rayan@example.com", role: "client" },
    { id: "3", username: "guest", email: "guest@example.com", role: "client" },
  ];

  const displayUsers = me ? [me, ...mockUsers.filter(u => u.role !== "admin")] : mockUsers;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#393939] pb-4">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-[#f4f4f4] mb-1">Users</h1>
          <p className="text-[14px] text-[#c6c6c6]">Manage system administrators and clients.</p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c6c6c6]" />
          <input 
            type="text" 
            placeholder="Search users..." 
            className="pl-9 pr-4 py-2 bg-[#262626] border border-[#393939] text-sm text-[#f4f4f4] focus:outline-none focus:border-[#0f62fe] w-full sm:w-64"
            style={{ borderRadius: 0 }}
          />
        </div>
      </div>

      <div className="carbon-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[12px] font-semibold text-[#c6c6c6] bg-[#262626] border-b border-[#393939] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayUsers.map((user, i) => (
                <tr key={i} className="border-b border-[#393939] hover:bg-[#393939] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#393939] flex items-center justify-center shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <UserAvatar size={16} className="text-[#f4f4f4]" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-[#f4f4f4] text-[14px]">{user.username}</div>
                        <div className="text-[#c6c6c6] text-[12px]">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[12px] bg-[#393939] border border-[#525252] text-[#f4f4f4]">
                      {user.role === 'admin' ? <Security size={12} className="text-[#0f62fe]" /> : <User size={12} />}
                      <span className="capitalize">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[#c6c6c6] text-[13px]">
                      <span className="w-2 h-2 bg-[#24a148]"></span> Active
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-[#4c4c4c] text-[#c6c6c6] hover:text-[#f4f4f4] transition-colors border-none bg-transparent cursor-pointer">
                      <OverflowMenuHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
