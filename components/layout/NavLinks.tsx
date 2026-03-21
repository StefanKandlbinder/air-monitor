"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLastMapPosition } from "@/lib/hooks/useLastMapPosition";

type NavLinksProps = {
  lang: string;
  exploreLabel: string;
  className?: string;
};

export function NavLinks({ lang, exploreLabel, className }: NavLinksProps) {
  const pathname = usePathname();
  const isExplore =
    pathname.startsWith(`/${lang}/explore`) ||
    pathname.startsWith(`/${lang}/station`);

  const lastPosition = useLastMapPosition();
  const exploreHref = lastPosition
    ? `/${lang}/explore?${lastPosition}`
    : `/${lang}/explore`;

  return (
    <nav className={cn("flex items-center gap-1", className)}>
      <Button variant={isExplore ? "secondary" : "ghost"} size="sm" asChild>
        <Link href={exploreHref} className="flex items-center gap-1.5">
          {exploreLabel}
          <Map className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </nav>
  );
}
