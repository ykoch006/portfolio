"use client";

export default function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  return (
    <button type="button" onClick={toggle} className={className} aria-label="toggle dark mode">
      <span className="if-dark" aria-hidden="true">☀</span>
      <span className="if-light" aria-hidden="true">☾</span>
    </button>
  );
}
