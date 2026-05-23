/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Cal Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        brand: {
          DEFAULT: "#6366f1",
          glow: "#818cf8",
        },
        surface: {
          0: "#09090b",
          1: "#111113",
          2: "#18181b",
          3: "#27272a",
          4: "#3f3f46",
          5: "#52525b",
        },
        accent: {
          red: "#f87171",
          green: "#4ade80",
          amber: "#fbbf24",
          blue: "#60a5fa",
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(99,102,241,0.35)",
        "glow-sm": "0 0 10px rgba(99,102,241,0.25)",
      },
      animation: {
        "fade-up": "fadeUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
