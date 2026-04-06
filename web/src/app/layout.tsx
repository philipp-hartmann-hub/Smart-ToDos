import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Der Projektmanager (Cloud)",
  description: "Mehrbenutzer-Version mit Neon + Vercel",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
