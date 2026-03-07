"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from "@/lib/services/firestore";
import type { CreateBudgetInput, Budget } from "@/types";
import { toast } from "sonner";

export function useBudgets(month: number, year: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["budgets", user?.uid, month, year],
    queryFn: () => getBudgets(user!.uid, month, year),
    enabled: !!user,
  });
}

export function useCreateBudget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBudgetInput) => createBudget(user!.uid, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Presupuesto creado");
    },
    onError: () => toast.error("Error al crear presupuesto"),
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Budget> }) =>
      updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Presupuesto actualizado");
    },
    onError: () => toast.error("Error al actualizar presupuesto"),
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => deleteBudget(id, user?.uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Presupuesto eliminado");
    },
    onError: () => toast.error("Error al eliminar presupuesto"),
  });
}
