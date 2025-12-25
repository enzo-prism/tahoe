export type MapStyleSource = "maptiler" | "maplibre-demo";

export function getMapStyleUrl(): { url: string; source: MapStyleSource } {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (key && key.trim().length > 0) {
    const trimmedKey = key.trim();
    return {
      url: `https://api.maptiler.com/maps/streets-v2/style.json?key=${trimmedKey}`,
      source: "maptiler"
    };
  }

  return {
    url: "https://demotiles.maplibre.org/style.json",
    source: "maplibre-demo"
  };
}
