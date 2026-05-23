"use client";

import Link from "next/link";
import { BareMetalServer, Launch, Security, Activity } from "@carbon/icons-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#161616] p-8 text-[#f4f4f4] font-sans">
      
      {/* Header Navigation */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-[#393939] pb-4">
        <div className="flex items-center gap-3">
          <BareMetalServer size={24} className="text-[#0f62fe]" />
          <span className="text-lg font-semibold tracking-tight">Rayan El Habib</span>
        </div>
        <Link href="/login">
          <Button variant="ghost" size="sm">Sign In</Button>
        </Link>
      </header>

      {/* Main Hero Container */}
      <main className="max-w-6xl w-full mx-auto my-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#393939] text-[#c6c6c6] text-xs font-mono">
            <span>RELEASE V1.0.0</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-light tracking-tight leading-tight text-[#f4f4f4]">
            Enterprise <br />
            <span className="font-semibold text-white">Server Orchestration</span>
          </h1>
          <p className="text-[16px] text-[#c6c6c6] leading-relaxed max-w-lg">
            Provision, manage, and scale server deployments with unmatched speed. Powered by Clean Architecture, Go daemon execution, and high-frequency Redis queues.
          </p>

          <div className="flex gap-4 pt-4">
            <Link href="/login">
              <Button size="lg" className="carbon-btn">
                Launch Console
                <Launch size={20} className="ml-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="secondary">
                View Deployments
              </Button>
            </Link>
          </div>
        </div>

        {/* Modular Brutalist Grid Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="carbon-panel p-6 space-y-4">
            <div className="w-8 h-8 bg-[#393939] flex items-center justify-center">
              <Launch size={16} className="text-[#0f62fe]" />
            </div>
            <h3 className="text-[16px] font-semibold text-white">Daemon Provisioning</h3>
            <p className="text-[13px] text-[#c6c6c6]">
              Instant orchestration and container allocation using high-performance Go routines.
            </p>
          </div>

          <div className="carbon-panel p-6 space-y-4">
            <div className="w-8 h-8 bg-[#393939] flex items-center justify-center">
              <Security size={16} className="text-[#24a148]" />
            </div>
            <h3 className="text-[16px] font-semibold text-white">Hardened Identity</h3>
            <p className="text-[13px] text-[#c6c6c6]">
              Secure JWT authorization, cryptographically-secure Bcrypt hashing, and IDOR protection.
            </p>
          </div>

          <div className="carbon-panel p-6 space-y-4 sm:col-span-2">
            <div className="w-8 h-8 bg-[#393939] flex items-center justify-center">
              <Activity size={16} className="text-[#f1c21b]" />
            </div>
            <h3 className="text-[16px] font-semibold text-white">Websocket Telemetry</h3>
            <p className="text-[13px] text-[#c6c6c6]">
              Real-time streaming and resource metrics directly from daemon controllers down to the web client.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto border-t border-[#393939] pt-4 text-xs text-[#8d8d8d] flex justify-between">
        <span>© 2026 IBM Carbon Design Standard.</span>
        <span>Infrastructure Automation.</span>
      </footer>
      
    </div>
  );
}
