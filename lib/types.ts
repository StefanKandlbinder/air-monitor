export type StationId = string;

export type OfficialStation = {
  code: string;
  kurzname: string;
  langname: string;
  geoLaenge: number;
  geoBreite: number;
  komponentenCodes: string[];
};

export type Station = {
  id: StationId;
  value: {
    name: string;
    hash: string;
  };
};

export type Component = "NO2" | "PM10kont" | "PM25kont";
export type Mean = "TMW" | "MW1" | "HMW";

export type Measurement = {
  zeitpunkt: number;
  station: string;
  komponente: string;
  mittelwert: string;
  einheit: string;
  messwert: string;
};

export type AirDataResult = {
  station: string;
  stationHash: string;
  component: string;
  mean: string;
  limit: number;
  date: Date;
  value: string;
};
