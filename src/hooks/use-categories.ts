"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  translateCategoriesToSpanish,
} from "@/lib/services/firestore";
import type { CreateCategoryInput, Category } from "@/types";
import { toast } from "sonner";

export function useCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasTranslated = useRef(false);

  const result = useQuery({
    queryKey: ["categories", user?.uid],
    queryFn: () => getCategories(user!.uid),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || hasTranslated.current || !result.data) return;
    const hasEnglish = result.data.some((c) =>
      ["Food & Dining", "Transport", "Shopping", "Entertainment", "Bills & Utilities",
       "Health", "Education", "Subscriptions", "Salary", "Other Income", "Other", "Home"].includes(c.name)
    );
    if (!hasEnglish) return;

    hasTranslated.current = true;
    translateCategoriesToSpanish(user.uid).then((count) => {
      if (count > 0) {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      }
    });
  }, [user, result.data, queryClient]);

  return result;
}

export function useCreateCategory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(user!.uid, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoría creada");
    },
    onError: () => toast.error("Error al crear categoría"),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoría actualizada");
    },
    onError: () => toast.error("Error al actualizar categoría"),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoría eliminada");
    },
    onError: () => toast.error("Error al eliminar categoría"),
  });
}
