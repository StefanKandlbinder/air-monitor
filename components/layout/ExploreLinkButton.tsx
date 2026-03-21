"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLastMapPosition } from "@/lib/hooks/useLastMapPosition";

type Props = { lang: string; label: string };

export function ExploreLinkButton({ lang, label }: Props) {
  const lastPosition = useLastMapPosition();
  const href = lastPosition ? `/${lang}/explore?${lastPosition}` : `/${lang}/explore`;

  return (
    <Button asChild size="lg" className="gap-2 px-8 text-base">
      <Link href={href}>
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}
