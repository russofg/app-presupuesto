"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDolarRates } from "@/lib/dolar-api";

export function useDolarRates() {
  return useQuery({
    queryKey: ["dolar-rates"],
    queryFn: fetchDolarRates,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
