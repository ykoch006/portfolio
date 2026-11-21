import { Space_Mono } from "next/font/google";

const mono = Space_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "700"] });

export default function HideoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={mono.variable} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
