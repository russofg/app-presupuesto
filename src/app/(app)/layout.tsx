"use client";

import { AppShell } from "@/components/layout/app-shell";
import { SmoothScroll } from "@/components/layout/smooth-scroll";

import { CustomCursor } from "@/components/custom-cursor";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <CustomCursor />
      <AppShell>{children}</AppShell>
    </SmoothScroll>
  );
}
