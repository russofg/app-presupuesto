"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Target,
  Tags,
  Settings,
  Plus,
  Search,
  Moon,
  Sun,
  Monitor,
  BarChart3,
  Upload,
  CalendarDays,
  DollarSign,
} from "lucide-react";
import { useTheme } from "next-themes";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Escribí un comando o buscá..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>

        <CommandGroup heading="Navegación">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Inicio
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/transactions"))}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Movimientos
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/budgets"))}>
            <PiggyBank className="mr-2 h-4 w-4" />
            Presupuestos
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/goals"))}>
            <Target className="mr-2 h-4 w-4" />
            Metas
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/calendar"))}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Calendario
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dolar"))}>
            <DollarSign className="mr-2 h-4 w-4" />
            Cotización dólar
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/reports"))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Reportes
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/categories"))}>
            <Tags className="mr-2 h-4 w-4" />
            Categorías
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            Ajustes
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Acciones">
          <CommandItem onSelect={() => runCommand(() => router.push("/transactions"))}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo movimiento
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/transactions/import"))}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tema">
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4" />
            Modo claro
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4" />
            Modo oscuro
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <Monitor className="mr-2 h-4 w-4" />
            Tema del sistema
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
