import React from "react";
import { BareMetalServer } from "@carbon/icons-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#161616]">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-12 h-12 bg-[#262626] border border-[#393939] flex items-center justify-center mb-3">
            <BareMetalServer size={24} className="text-[#0f62fe]" />
          </div>
          <h1 className="text-2xl font-normal tracking-tight text-[#f4f4f4]">Rayan El Habib</h1>
        </div>
        
        <div className="carbon-panel p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
