import type { Metadata } from "next";
import "./globals.css";
import AutoUpdateWatcher from "@/components/AutoUpdateWatcher";

export const metadata: Metadata = {
  title: "Faktur Database Explorer (2024 - 2026)",
  description: "Database & Relational Explorer Penjualan & Retur Obat MBI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
        <AutoUpdateWatcher />
      </body>
    </html>
  );
}
