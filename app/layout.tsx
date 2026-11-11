import type { Metadata, Viewport } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const mono = Space_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "y.koc — notyuk",
  description: "mashups, photographs and unreleased demos by yuksel koc.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ece7d9" },
    { media: "(prefers-color-scheme: dark)", color: "#16140f" },
  ],
};

const themeScript = `(function(){try{var s=localStorage.getItem('theme');var t=(s==='dark'||s==='light')?s:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={mono.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
