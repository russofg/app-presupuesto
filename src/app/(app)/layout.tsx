"use client";

import { AppShell } from "@/components/layout/app-shell";
import { SmoothScroll } from "@/components/layout/smooth-scroll";

import { AppLock } from "@/components/layout/app-lock";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <AppLock>
        <AppShell>{children}</AppShell>
      </AppLock>
    </SmoothScroll>
  );
}
