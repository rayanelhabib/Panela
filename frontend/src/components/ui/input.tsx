import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1 w-full">
        {label && (
          <label className="text-[12px] font-normal text-[#c6c6c6] tracking-wide select-none">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            className={cn(
              "flex h-10 w-full bg-[#262626] border-b border-[#393939] px-4 text-[14px] text-[#f4f4f4] transition-all",
              "placeholder:text-[#8d8d8d]",
              "focus:outline-none focus:border-b-2 focus:border-[#0f62fe]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-[#da1e28] focus:border-[#da1e28]",
              className
            )}
            style={{ borderRadius: 0 }}
            ref={ref}
            {...props}
          />
        </div>
        {error && <span className="text-[12px] text-[#da1e28] mt-1 font-normal">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
