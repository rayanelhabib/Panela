"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-normal transition-all focus:outline-none focus:ring-2 focus:ring-[#0f62fe] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";

    const variants = {
      primary: "bg-[#0f62fe] text-white hover:bg-[#0353e9] active:bg-[#0c2fbf]",
      secondary: "bg-[#393939] text-[#f4f4f4] hover:bg-[#4c4c4c] active:bg-[#6f6f6f]",
      danger: "bg-[#da1e28] text-white hover:bg-[#b21922] active:bg-[#750e13]",
      ghost: "hover:bg-[#393939] text-[#f4f4f4] bg-transparent",
    };

    const sizes = {
      sm: "h-8 px-4 text-[12px]",
      md: "h-11 px-6 text-[14px]",
      lg: "h-12 px-8 text-[16px]",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        style={{ borderRadius: 0 }}
        {...props}
      >
        {isLoading && (
          <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
