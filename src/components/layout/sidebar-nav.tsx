"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Target,
  Tags,
  Settings,
  LogOut,
  Sparkles,
  Search,
  BarChart3,
  CalendarDays,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logOut } from "@/lib/services/auth";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LevelBadge } from "@/components/level-badge";
import { getLevel } from "@/lib/gamification";
import { useUISounds } from "@/hooks/use-ui-sounds";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/budgets", label: "Presupuestos", icon: PiggyBank },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/subscriptions", label: "Suscripciones", icon: CreditCard },
  { href: "/dolar", label: "Dólar", icon: DollarSign },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
  { href: "/categories", label: "Categorías", icon: Tags },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, settings } = useAuth();
  const { playPop } = useUISounds();

  const displayName = settings?.displayName || user?.displayName || "";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const totalXP = settings?.totalXP ?? 0;
  const level = getLevel(totalXP);

  const handleLogout = async () => {
    try {
      await logOut();
      router.push("/login");
    } catch {
      toast.error("Error al cerrar sesión");
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen border-r border-border/50 bg-sidebar sticky top-0">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={playPop}>
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">Financia</span>
        </Link>
      </div>

      <div className="px-3 mb-4">
        <button
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            playPop();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="text-[10px] font-medium bg-background/80 px-1.5 py-0.5 rounded-md border border-border/50">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={playPop}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5 relative z-10" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border/50 space-y-2">
        <div className="px-3 py-1">
          <LevelBadge
            name={level.name}
            icon={level.icon}
            progress={level.progress}
            xpToNext={level.xpToNext}
            color={level.color}
          />
        </div>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
            {initials || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName || "Usuario"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive rounded-xl"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
