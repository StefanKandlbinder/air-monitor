"use client";

import { useCallback, useMemo, useState } from "react";
import { groupParameters } from "@/components/station-map/constants";
import type { OpenAQLocation } from "@/lib/types";

export function useParameterFilter(locations: OpenAQLocation[]) {
  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);

  const availableParameters = useMemo(() => {
    const parameters = new Set<string>();
    for (const location of locations) {
      for (const sensor of location.sensors) {
        parameters.add(sensor.parameter.name.toLowerCase());
      }
    }
    return Array.from(parameters).sort();
  }, [locations]);

  const groupedParameters = useMemo(
    () => groupParameters(availableParameters),
    [availableParameters],
  );

  const filteredLocations = useMemo(() => {
    if (!selectedParameters.length) return locations;
    return locations.filter((location) =>
      selectedParameters.every((param) =>
        location.sensors.some((s) => s.parameter.name.toLowerCase() === param),
      ),
    );
  }, [selectedParameters, locations]);

  const toggleParameter = useCallback((parameter: string) => {
    setSelectedParameters((current) =>
      current.includes(parameter)
        ? current.filter((item) => item !== parameter)
        : [...current, parameter],
    );
  }, []);

  return {
    selectedParameters,
    setSelectedParameters,
    groupedParameters,
    filteredLocations,
    toggleParameter,
  };
}
