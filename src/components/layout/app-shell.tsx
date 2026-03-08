"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";
import { FloatingActionButton } from "@/components/fab";
import { DashboardSkeleton } from "@/components/loading-skeleton";
import { PageTransition } from "./page-transition";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, settings, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const needsOnboarding = !settings || !settings.onboardingCompleted;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (needsOnboarding && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [user, needsOnboarding, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 animate-pulse" />
          <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-primary rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (needsOnboarding && pathname !== "/onboarding") return null;

  if (pathname === "/onboarding") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0 flex flex-col relative w-full overflow-hidden">
        <PageTransition>{children}</PageTransition>
      </main>
      <FloatingActionButton />
      <MobileNav />
    </div>
  );
}
