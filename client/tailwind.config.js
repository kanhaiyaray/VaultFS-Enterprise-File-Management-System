/** @type {import('tailwindcss').Config} */
const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

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
          DEFAULT: withOpacity("--brand"),
          glow: withOpacity("--brand-glow"),
        },
        surface: {
          0: withOpacity("--surface-0"),
          1: withOpacity("--surface-1"),
          2: withOpacity("--surface-2"),
          3: withOpacity("--surface-3"),
          4: withOpacity("--surface-4"),
          5: withOpacity("--surface-5"),
        },
        accent: {
          red: withOpacity("--accent-red"),
          green: withOpacity("--accent-green"),
          amber: withOpacity("--accent-amber"),
          blue: withOpacity("--accent-blue"),
        },
        gray: {
          200: withOpacity("--gray-200"),
          300: withOpacity("--gray-300"),
          400: withOpacity("--gray-400"),
          500: withOpacity("--gray-500"),
          600: withOpacity("--gray-600"),
          700: withOpacity("--gray-700"),
        },
        zinc: {
          100: withOpacity("--zinc-100"),
          400: withOpacity("--zinc-400"),
          600: withOpacity("--zinc-600"),
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
