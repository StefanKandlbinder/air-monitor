import type { Station, StationId } from "@/lib/types";

export const stations = new Map<StationId, Station["value"]>([
  ["S415", { name: "Linz-24er-Turm", hash: "#Linz-#24er-Turm" }],
  ["S184", { name: "Linz-Stadtpark", hash: "#Linz-#Stadtpark" }],
  ["S416", { name: "Linz-Neue-Welt", hash: "#Linz-#Neue-Welt" }],
  ["S431", { name: "Linz-Roemerberg", hash: "#Linz-#Roemerberg" }]
]);

export const stationIds: StationId[] = ["S184", "S415", "S416", "S431"];
