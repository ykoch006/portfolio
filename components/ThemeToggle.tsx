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
    <button type="button" onClick={toggle} className={className}>
      <span className="if-dark">light</span>
      <span className="if-light">dark</span>
    </button>
  );
}
