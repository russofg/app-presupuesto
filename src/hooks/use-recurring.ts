"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import {
  getRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  processRecurringTransactions,
} from "@/lib/services/firestore";
import type { RecurringTransaction } from "@/types";
import { toast } from "sonner";

export function useRecurring() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasProcessed = useRef(false);

  const result = useQuery({
    queryKey: ["recurring", user?.uid],
    queryFn: () => getRecurringTransactions(user!.uid),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || hasProcessed.current || !result.data) return;
    hasProcessed.current = true;
    processRecurringTransactions(user.uid).then((count) => {
      if (count > 0) {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["recurring"] });
        toast.success(`${count} movimiento${count > 1 ? "s" : ""} recurrente${count > 1 ? "s" : ""} generado${count > 1 ? "s" : ""}`);
      }
    });
  }, [user, result.data, queryClient]);

  return result;
}

export function useCreateRecurring() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<RecurringTransaction, "id" | "userId" | "createdAt" | "updatedAt">) =>
      createRecurringTransaction(user!.uid, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
    },
  });
}

export function useDeleteRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRecurringTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      toast.success("Recurrente eliminado");
    },
    onError: () => toast.error("Error al eliminar recurrente"),
  });
}
