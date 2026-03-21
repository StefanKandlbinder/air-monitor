"use client";

import { usePathname } from "next/navigation";

export function FooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.includes("/explore")) return null;
  if (pathname.includes("/station")) return <div className="hidden sm:block">{children}</div>;
  return <>{children}</>;
}
