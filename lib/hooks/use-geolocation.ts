"use client";

import { useState } from "react";

type Coords = { latitude: number; longitude: number };

const HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};

const LOW_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 60_000,
};

export function useGeolocation(
  onSuccess: (coords: Coords) => void | Promise<void>,
  onError: (error: GeolocationPositionError) => void,
) {
  const [isLocating, setIsLocating] = useState(false);
  const isSupported = typeof navigator !== "undefined" && !!navigator.geolocation;

  const locate = () => {
    setIsLocating(true);

    const handleSuccess = (position: GeolocationPosition) => {
      const result = onSuccess({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      if (result instanceof Promise) {
        result.finally(() => setIsLocating(false));
      } else {
        setIsLocating(false);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      setIsLocating(false);
      onError(error);
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (error) => {
        if (error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
          navigator.geolocation.getCurrentPosition(handleSuccess, handleError, LOW_ACCURACY_OPTIONS);
        } else {
          handleError(error);
        }
      },
      HIGH_ACCURACY_OPTIONS,
    );
  };

  return { locate, isLocating, isSupported };
}
