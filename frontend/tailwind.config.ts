import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0F172A", // Deep Navy
        secondary: "#334155", // Slate Blue
        background: "#F8FAFC", // Neutral Gray
        "surface-card": "#FFFFFF",
        "surface-border": "#E2E8F0",
        "success-emerald": "#059669",
        "warning-amber": "#D97706",
        "danger-rose": "#E11D48",
        "risk-critical": "#A32D2D",
        "risk-high": "#854F0B",
        "risk-medium": "#185FA5",
        "risk-low": "#3B6D11",
      },
      borderRadius: {
        DEFAULT: "4px",
        md: "4px",
        lg: "8px",
        xl: "12px",
      },
      spacing: {
        unit: "4px",
        "sidebar-width": "260px",
        "max-content-width": "1440px",
        "container-margin": "24px",
        "card-padding": "20px",
        gutter: "16px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        "display-lg": ["2rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["1.5rem", { lineHeight: "2rem", fontWeight: "600" }],
        "headline-sm": ["1.125rem", { lineHeight: "1.75rem", fontWeight: "600" }],
        "body-lg": ["1rem", { lineHeight: "1.5rem", fontWeight: "400" }],
        "body-md": ["0.875rem", { lineHeight: "1.25rem", fontWeight: "400" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.125rem", fontWeight: "400" }],
        "label-caps": ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.05em", fontWeight: "600" }],
        "data-mono": ["0.75rem", { lineHeight: "1rem", fontWeight: "500" }],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;

