import type { Metadata, Viewport } from "next";
import Drive from "./_game/Drive";

export const metadata: Metadata = {
  title: "drive — y.koc",
};

export const viewport: Viewport = { themeColor: "#c4c8cf" };

export default function DrivePage() {
  return <Drive />;
}
