import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function StationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 h-14 border-b bg-background/95 backdrop-blur">
        <div className="flex h-full w-full items-center justify-between px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            openaq Air Monitor
          </Link>
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
