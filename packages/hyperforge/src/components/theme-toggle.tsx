"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { SpectacularButton } from "@/components/ui/spectacular-button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <SpectacularButton variant="ghost" size="sm" className="w-9 h-9 px-0">
        <span className="sr-only">Toggle theme</span>
      </SpectacularButton>
    );
  }

  return (
    <SpectacularButton
      variant="ghost"
      size="sm"
      className="w-9 h-9 px-0"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title="Toggle Theme"
    >
      <span className="sr-only">Toggle theme</span>
      {theme === "dark" ? (
        <Moon className="h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-neon-purple" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-orange-500" />
      )}
    </SpectacularButton>
  );
}
