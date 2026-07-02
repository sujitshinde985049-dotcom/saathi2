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
        saathi: {
          blue: {
            50: "#eff6ff",
            100: "#dbeafe",
            200: "#bfdbfe",
            300: "#93c5fd",
            400: "#60a5fa",
            500: "#1e56a0",
            600: "#164a8a",
            700: "#123d72",
            800: "#0e305a",
            900: "#0a2342",
          },
          green: {
            50: "#f0fdf4",
            100: "#dcfce7",
            200: "#bbf7d0",
            300: "#86efac",
            400: "#4ade80",
            500: "#16a34a",
            600: "#15803d",
            700: "#166534",
            800: "#14532d",
            900: "#052e16",
          },
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        corporate: "0 4px 24px rgba(30, 86, 160, 0.08)",
        "corporate-lg": "0 8px 40px rgba(30, 86, 160, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
