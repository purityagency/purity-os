import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Purity OS",
  description: "Espace client et admin Purity Agency",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
