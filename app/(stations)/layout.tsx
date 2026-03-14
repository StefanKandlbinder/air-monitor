import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function StationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 h-14 border-b bg-background/95 backdrop-blur justify-between">
        <div className="flex h-full w-full items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-heading font-semibold tracking-tight text-xl">
              Air Monitor
            </h1>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      {children}
      <Link
        href="https://openaq.org"
        className="fixed bottom-4 left-4 bg-background/95 backdrop-blur rounded-md p-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src="/openaq-logo.svg"
          alt="OpenAQ"
          width={36}
          height={20}
          priority
        />
      </Link>
    </div>
  );
}
