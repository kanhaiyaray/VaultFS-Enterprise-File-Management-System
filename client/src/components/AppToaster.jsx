import { Toaster } from "react-hot-toast";
import { useTheme } from "../context/ThemeContext";

export default function AppToaster() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: isDark ? "#18181b" : "#ffffff",
          color: isDark ? "#f4f4f5" : "#0f172a",
          border: `1px solid ${isDark ? "#3f3f46" : "#cbd5e1"}`,
          borderRadius: "10px",
          fontSize: "13px",
        },
        success: {
          iconTheme: { primary: "#4ade80", secondary: isDark ? "#18181b" : "#ffffff" },
        },
        error: {
          iconTheme: { primary: "#f87171", secondary: isDark ? "#18181b" : "#ffffff" },
        },
      }}
    />
  );
}
