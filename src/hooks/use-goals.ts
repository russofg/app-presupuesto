"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from "@/lib/services/firestore";
import type { CreateSavingsGoalInput, SavingsGoal } from "@/types";
import { toast } from "sonner";

export function useGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["goals", user?.uid],
    queryFn: () => getSavingsGoals(user!.uid),
    enabled: !!user,
  });
}

export function useCreateGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSavingsGoalInput) => createSavingsGoal(user!.uid, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta creada");
    },
    onError: () => toast.error("Error al crear meta"),
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SavingsGoal> }) =>
      updateSavingsGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta actualizada");
    },
    onError: () => toast.error("Error al actualizar meta"),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => deleteSavingsGoal(id, user?.uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta eliminada");
    },
    onError: () => toast.error("Error al eliminar meta"),
  });
}
