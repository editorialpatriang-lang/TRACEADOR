"use client";
/**
 * Proveedores globales: React Query + tema.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  useTheme();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
