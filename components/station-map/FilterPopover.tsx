"use client";

import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroupButton } from "@/components/ui/input-group";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { GroupedParameters } from "@/components/station-map/types";
import { ParameterSection } from "@/components/station-map/ParameterSection";
import { useDictionary } from "@/components/providers/DictionaryProvider";

type FilterPopoverProps = {
  groupedParameters: GroupedParameters;
  selectedParameters: string[];
  onToggleParameter: (parameter: string) => void;
  onClear: () => void;
};

export function FilterPopover({
  groupedParameters,
  selectedParameters,
  onToggleParameter,
  onClear,
}: FilterPopoverProps) {
  const dict = useDictionary();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <InputGroupButton
          size="icon-sm"
          variant="ghost"
          aria-label={dict.filter.ariaLabel}
          className="relative text-foreground hover:bg-muted hover:text-foreground"
        >
          <Filter />
          {selectedParameters.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center px-0.5 text-[9px] leading-none"
            >
              {selectedParameters.length}
            </Badge>
          )}
        </InputGroupButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {dict.filter.description}
          </p>
          {selectedParameters.length ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClear}
              className="h-7 px-2 text-xs"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              {dict.filter.clear}
            </Button>
          ) : null}
        </div>
        <div className="max-h-56 space-y-3 overflow-auto pr-1">
          <ParameterSection
            title={dict.filter.airQuality}
            parameters={groupedParameters.airQuality}
            selectedParameters={selectedParameters}
            onToggleParameter={onToggleParameter}
          />
          <ParameterSection
            title={dict.filter.meteorological}
            parameters={groupedParameters.meteorological}
            selectedParameters={selectedParameters}
            onToggleParameter={onToggleParameter}
          />
          <ParameterSection
            title={dict.filter.other}
            parameters={groupedParameters.other}
            selectedParameters={selectedParameters}
            onToggleParameter={onToggleParameter}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
