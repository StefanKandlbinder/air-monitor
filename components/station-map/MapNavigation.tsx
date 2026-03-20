"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
import { CompassIcon } from "@/lib/icons/CompassIcon";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/components/providers/DictionaryProvider";

type MapNavigationProps = {
  bearing: number;
  isLocating?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetNorth: () => void;
  onCenterOnUserLocation?: () => void;
};

export function MapNavigation({
  bearing,
  isLocating = false,
  onZoomIn,
  onZoomOut,
  onResetNorth,
  onCenterOnUserLocation,
}: MapNavigationProps) {
  const dict = useDictionary();

  return (
    <div className="absolute left-4 bottom-4 flex gap-1 z-10">
      <Button
        variant="secondary"
        size="icon"
        onClick={onZoomIn}
        aria-label={dict.map.zoomIn}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={onZoomOut}
        aria-label={dict.map.zoomOut}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        className="ml-2"
        onClick={onResetNorth}
        aria-label={dict.map.resetNorth}
      >
        <CompassIcon
          bearing={bearing}
          className="h-4 w-4 transition-transform"
        />
      </Button>
      {onCenterOnUserLocation ? (
        <Button
          variant="secondary"
          size="icon"
          onClick={onCenterOnUserLocation}
          disabled={isLocating}
          aria-label={dict.map.myLocation}
        >
          <LocateFixed className="h-4 w-4" />
        </Button>
      ) : null}
      {/* <Button variant="secondary" size="icon" className="ml-2" asChild>
        <Link href="https://openaq.org" target="_blank" rel="noopener noreferrer" aria-label="OpenAQ">
          <Image src="/openaq-logo.svg" alt="OpenAQ" width={28} height={16} className="dark:invert" />
        </Link>
      </Button> */}
    </div>
  );
}
