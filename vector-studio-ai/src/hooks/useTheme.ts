"use client";
/**
 * Hook de tema: aplica la clase .dark al <html> y persiste en localStorage.
 */
import { useEffect } from "react";
import { useStudioStore } from "@/store/useStudioStore";

const KEY = "vector-studio-theme";

export function useTheme(): void {
  const theme = useStudioStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* sin persistencia */
    }
  }, [theme]);

  // Inicialización: leer tema persistido / preferencia del sistema
  useEffect(() => {
    let initial = "dark" as "dark" | "light";
    try {
      const stored = localStorage.getItem(KEY);
      if (stored === "light" || stored === "dark") initial = stored;
      else if (window.matchMedia?.("(prefers-color-scheme: light)").matches) initial = "light";
    } catch {
      /* ok */
    }
    useStudioStore.getState().setTheme(initial);
  }, []);
}
