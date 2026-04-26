import type { Metadata } from "next";
import "./globals.css";

import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: "ESCO Semantic Search",
  description: "Search ESCO skills with OpenAI embeddings and Supabase pgvector.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-[#f7efe6] text-foreground">
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
