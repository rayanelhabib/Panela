"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BareMetalServer, Settings, UserMultiple, Logout, Menu, Close, Dashboard, Search, Notification } from "@carbon/icons-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: Dashboard },
  { name: "Deployments", href: "/servers", icon: BareMetalServer },
  { name: "Identity & Access", href: "/users", icon: UserMultiple },
  { name: "Preferences", href: "/settings", icon: Settings },
];

interface SystemNotification {
  id: string;
  message: string;
  type: string;
  created_at: number;
  read: boolean;
}

export default function CarbonDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("panella_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications");
        if (res.data?.data) {
          setNotifications(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("panella_token");
    window.location.href = "/login";
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/read");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[#161616]/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Strict Carbon Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#393939] bg-[#161616] transition-transform lg:static lg:block lg:translate-x-0 w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-[3rem] shrink-0 items-center justify-between px-4 border-b border-[#393939] bg-[#262626]">
          <div className="flex items-center gap-3">
            <BareMetalServer className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight text-[#f4f4f4]">
              Rayan El Habib
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#c6c6c6] hover:text-[#f4f4f4]">
            <Close className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col pt-4">
          <div className="text-[11px] font-semibold text-[#8d8d8d] uppercase tracking-wider mb-2 px-4">Core Infrastructure</div>
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-x-3 px-4 py-3 text-[14px] transition-colors border-l-4",
                  isActive
                    ? "bg-[#393939] text-[#f4f4f4] border-primary"
                    : "text-[#c6c6c6] hover:bg-[#393939] hover:text-[#f4f4f4] border-transparent"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#393939]">
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-x-3 px-4 py-4 text-[14px] text-[#da1e28] hover:bg-[#393939] transition-colors"
          >
            <Logout className="h-[18px] w-[18px] shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-hidden relative min-h-screen">
        {/* Carbon Global Header */}
        <header className="flex h-[3rem] shrink-0 items-center justify-between border-b border-[#393939] px-4 bg-[#161616] relative">
          <div className="flex items-center gap-4 h-full">
            <button
              type="button"
              className="-ml-4 px-4 h-full text-[#c6c6c6] hover:bg-[#393939] hover:text-[#f4f4f4] lg:hidden border-r border-[#393939]"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Breadcrumb / Search Mock */}
            <div className="hidden sm:flex items-center gap-2 text-[#c6c6c6] text-[14px]">
              <span>Infrastructure</span>
              <span>/</span>
              <span className="text-[#f4f4f4] font-medium">Dashboard</span>
            </div>
          </div>
          
          <div className="flex items-center h-full">
            <button className="h-full px-4 text-[#c6c6c6] hover:bg-[#393939] hover:text-[#f4f4f4] transition-colors border-l border-[#393939]">
              <Search className="w-[18px] h-[18px]" />
            </button>
            <button 
              onClick={() => setShowNotifs(!showNotifs)}
              className="h-full px-4 text-[#c6c6c6] hover:bg-[#393939] hover:text-[#f4f4f4] transition-colors relative border-l border-[#393939]"
            >
              <Notification className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-[10px] right-[10px] bg-[#0f62fe] text-white font-mono text-[9px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <Link href="/settings" className="h-full px-4 flex items-center gap-3 cursor-pointer hover:bg-[#393939] transition-colors border-l border-[#393939]" title="View Profile Preferences">
              <div className="h-[24px] w-[24px] rounded-full bg-[#0f62fe] flex items-center justify-center text-white font-semibold text-[12px]">
                A
              </div>
            </Link>
          </div>

          {/* Real Notification Dropdown popup */}
          {showNotifs && (
            <div className="absolute top-[3rem] right-4 w-80 bg-[#262626] border border-[#393939] shadow-2xl z-50 text-left">
              <div className="p-3 border-b border-[#393939] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-white">System Alerts</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-[#0f62fe] hover:underline bg-transparent border-none cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-[12px] text-[#8d8d8d]">
                    No system alerts recorded.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={cn(
                        "p-3 border-b border-[#393939] text-[12px] transition-colors",
                        n.read ? "bg-[#262626] text-[#c6c6c6]" : "bg-[#161616] text-[#f4f4f4] border-l-2 border-l-[#0f62fe]"
                      )}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.5 bg-[#393939] text-[#f4f4f4]">
                          {n.type}
                        </span>
                        <span className="text-[10px] text-[#8d8d8d] font-mono">
                          {new Date(n.created_at * 1000).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#161616]">
          {children}
        </div>
      </main>
    </div>
  );
}
