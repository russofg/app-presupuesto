"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/services/firestore";
import type { CreateTransactionInput, Transaction } from "@/types";
import { toast } from "sonner";

export function useTransactions(filters?: {
  month?: number;
  year?: number;
  type?: string;
  categoryId?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transactions", user?.uid, filters],
    queryFn: () => getTransactions(user!.uid, filters),
    enabled: !!user,
  });
}

function matchesFilters(tx: Transaction, filters?: { month?: number; year?: number; type?: string; categoryId?: string }) {
  if (!filters) return true;
  const d = new Date(tx.date);
  if (filters.month !== undefined && d.getMonth() + 1 !== filters.month) return false;
  if (filters.year !== undefined && d.getFullYear() !== filters.year) return false;
  if (filters.type && tx.type !== filters.type) return false;
  if (filters.categoryId && tx.categoryId !== filters.categoryId) return false;
  return true;
}

export function useCreateTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransactionInput) => createTransaction(user!.uid, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      const tempId = `temp-${Date.now()}`;
      const optimisticTx: Transaction = {
        id: tempId,
        userId: user!.uid,
        ...input,
        date: input.date,
        tags: input.tags ?? [],
        isRecurring: input.isRecurring ?? false,
        notes: input.notes ?? "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const cache = queryClient.getQueryCache();
      const queries = cache.findAll({ queryKey: ["transactions"] });
      const previous: Array<{ queryKey: unknown[]; data: Transaction[] | undefined }> = [];
      for (const q of queries) {
        const filters = q.queryKey[2] as { month?: number; year?: number; type?: string; categoryId?: string } | undefined;
        if (!matchesFilters(optimisticTx, filters)) continue;
        const old = queryClient.getQueryData<Transaction[]>(q.queryKey);
        previous.push({ queryKey: [...q.queryKey], data: old });
        queryClient.setQueryData<Transaction[]>(q.queryKey, old ? [optimisticTx, ...old] : [optimisticTx]);
      }

      return { previous };
    },
    onSuccess: (_, __, context) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Movimiento agregado");
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        for (const { queryKey, data } of context.previous) {
          queryClient.setQueryData(queryKey, data);
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
      }
      toast.error("Error al agregar movimiento");
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransactionInput> }) =>
      updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Movimiento actualizado");
    },
    onError: () => {
      toast.error("Error al actualizar movimiento");
    },
  });
}

export type DeleteTransactionInput = string | { id: string; tx?: import("@/types").Transaction };

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: DeleteTransactionInput) => {
      const id = typeof input === "string" ? input : input.id;
      await deleteTransaction(id, user?.uid);
      return input;
    },
    onSuccess: (input) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (typeof input === "string") {
        toast.success("Movimiento eliminado");
      }
    },
    onError: () => {
      toast.error("Error al eliminar movimiento");
    },
  });
}
