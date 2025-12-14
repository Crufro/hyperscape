import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base colors - adapt to theme
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",

        // Glass/Panel colors
        "glass-bg": "oklch(var(--glass-bg))",
        "glass-border": "oklch(var(--glass-border))",

        // Accent colors
        "neon-blue": "oklch(var(--neon-blue))",
        "neon-purple": "oklch(var(--neon-purple))",
        "neon-green": "oklch(var(--neon-green))",

        // Semantic UI colors (all theme-aware)
        muted: {
          DEFAULT: "oklch(var(--foreground) / 0.6)",
          foreground: "oklch(var(--foreground) / 0.4)",
        },
        accent: {
          DEFAULT: "oklch(var(--neon-purple))",
          foreground: "oklch(var(--foreground))",
        },
        destructive: {
          DEFAULT: "oklch(50% 0.2 25)", // Red that works in both modes
          foreground: "oklch(var(--foreground))",
        },
        border: "oklch(var(--glass-border))",
        input: "oklch(var(--glass-border))",
        ring: "oklch(var(--neon-purple))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backdropBlur: {
        xs: "2px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "industrial-gradient":
          "linear-gradient(135deg, oklch(var(--neon-blue) / 0.1) 0%, oklch(var(--neon-purple) / 0.1) 100%)",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Roboto Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
