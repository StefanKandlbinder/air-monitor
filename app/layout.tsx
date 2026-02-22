import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { GlobalToastListener } from "@/components/global-toast-listener";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Feinstaub Linz",
  description: "Air quality API and alert jobs for Linz"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <GlobalToastListener />
          <QueryProvider>{children}</QueryProvider>
          <Toaster position="bottom-left" />
        </ThemeProvider>
      </body>
    </html>
  );
}
