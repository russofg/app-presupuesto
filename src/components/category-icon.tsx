"use client";

import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { container: "w-8 h-8", icon: "w-4 h-4" },
  md: { container: "w-10 h-10", icon: "w-5 h-5" },
  lg: { container: "w-12 h-12", icon: "w-6 h-6" },
};

export function CategoryIcon({ icon, color, size = "md", className }: CategoryIconProps) {
  const IconComponent = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[icon] ?? LucideIcons.Circle;
  const sizes = sizeMap[size];

  return (
    <div
      className={cn("rounded-xl flex items-center justify-center shrink-0", sizes.container, className)}
      style={{ backgroundColor: `${color}18` }}
    >
      <IconComponent className={sizes.icon} style={{ color }} />
    </div>
  );
}
