"use client";

import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { GroupedParameters } from "@/components/station-map/types";

type FilterPopoverProps = {
  groupedParameters: GroupedParameters;
  selectedParameters: string[];
  onToggleParameter: (parameter: string) => void;
  onClear: () => void;
};

function ParameterSection({
  title,
  parameters,
  selectedParameters,
  onToggleParameter,
}: {
  title: string;
  parameters: string[];
  selectedParameters: string[];
  onToggleParameter: (parameter: string) => void;
}) {
  if (!parameters.length) {
    return null;
  }

  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {parameters.map((parameter) => {
          const selected = selectedParameters.includes(parameter);
          return (
            <Button
              key={parameter}
              variant={selected ? "default" : "outline"}
              size="sm"
              type="button"
              className="h-7 px-2 text-[11px]"
              onClick={() => onToggleParameter(parameter)}
            >
              {parameter}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterPopover({
  groupedParameters,
  selectedParameters,
  onToggleParameter,
  onClear,
}: FilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Filter className="mr-1 h-3.5 w-3.5" />
          Station parameters
          {selectedParameters.length ? (
            <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px]">
              {selectedParameters.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Filter stations by parameter
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
              Clear
            </Button>
          ) : null}
        </div>
        <div className="max-h-56 space-y-3 overflow-auto pr-1">
          <ParameterSection
            title="Air quality"
            parameters={groupedParameters.airQuality}
            selectedParameters={selectedParameters}
            onToggleParameter={onToggleParameter}
          />
          <ParameterSection
            title="Meteorological"
            parameters={groupedParameters.meteorological}
            selectedParameters={selectedParameters}
            onToggleParameter={onToggleParameter}
          />
          <ParameterSection
            title="Other"
            parameters={groupedParameters.other}
            selectedParameters={selectedParameters}
            onToggleParameter={onToggleParameter}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
