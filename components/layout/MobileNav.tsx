"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLastMapPosition } from "@/lib/hooks/useLastMapPosition";

type Props = {
  lang: string;
  homeLabel: string;
  exploreLabel: string;
};

export function MobileNav({ lang, homeLabel, exploreLabel }: Props) {
  const pathname = usePathname();

  const isHome    = pathname === `/${lang}` || pathname === `/${lang}/`;
  const isExplore = pathname.startsWith(`/${lang}/explore`) || pathname.startsWith(`/${lang}/station`);

  const lastPosition = useLastMapPosition();
  const exploreHref = lastPosition
    ? `/${lang}/explore?${lastPosition}`
    : `/${lang}/explore`;

  const items = [
    { href: `/${lang}`,  label: homeLabel,    icon: Home, active: isHome    },
    { href: exploreHref, label: exploreLabel, icon: Map,  active: isExplore },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex sm:hidden h-16 items-center justify-center gap-8
                    bg-background/20 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      {items.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-1 py-2"
        >
          <span className={cn(
            "flex items-center justify-center rounded-full w-16 h-8 transition-colors",
            active ? "bg-foreground/10" : ""
          )}>
            <Icon className={cn("h-5 w-5 transition-colors", active ? "text-foreground" : "text-muted-foreground")} />
          </span>
          <span className={cn(
            "text-[11px] font-medium transition-colors",
            active ? "text-foreground" : "text-muted-foreground"
          )}>
            {label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
