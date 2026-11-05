"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    // Follow the OS until the user picks manually.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem("wf-theme")) return;
      } catch {}
      document.documentElement.classList.toggle("dark", e.matches);
      setDark(e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("wf-theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button onClick={toggle} aria-label="Toggle dark mode" className="btn-ghost !px-3 !py-2">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
      {withLabel && <span>{dark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
