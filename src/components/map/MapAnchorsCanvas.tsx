import React, { useMemo } from "react";

export type AnchorPoint = {
  x: number;
  y: number;
};

export type MapAnchors = {
  entrances: AnchorPoint[];
  walkway: AnchorPoint[];
  blockedZones: AnchorPoint[][];
  allowedArea?: AnchorPoint[];
};

type MapAnchorsCanvasProps = {
  mapImageUrl: string;
  anchors: MapAnchors;
  mode: "ENTRANCE" | "WALKWAY" | "BLOCKED" | "ALLOWED" | null;
  onChange: (anchors: MapAnchors) => void;
};

const toPercent = (value: number) => `${Math.max(0, Math.min(1, value)) * 100}%`;

export default function MapAnchorsCanvas({
  mapImageUrl,
  anchors,
  mode,
  onChange,
}: MapAnchorsCanvasProps) {
  const blockedPolygons = useMemo(() => anchors.blockedZones ?? [], [anchors.blockedZones]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const point = { x, y };

    if (mode === "ENTRANCE") {
      onChange({ ...anchors, entrances: [...anchors.entrances, point] });
      return;
    }

    if (mode === "WALKWAY") {
      onChange({ ...anchors, walkway: [...anchors.walkway, point] });
      return;
    }

    if (mode === "BLOCKED") {
      const zones = anchors.blockedZones.length ? [...anchors.blockedZones] : [[]];
      zones[zones.length - 1] = [...zones[zones.length - 1], point];
      onChange({ ...anchors, blockedZones: zones });
      return;
    }

    if (mode === "ALLOWED") {
      const allowedArea = anchors.allowedArea ? [...anchors.allowedArea, point] : [point];
      onChange({ ...anchors, allowedArea });
    }
  };

  const walkwayPoints = anchors.walkway
    .map((p) => `${p.x * 100},${p.y * 100}`)
    .join(" ");

  const allowedPoints = anchors.allowedArea
    ? anchors.allowedArea.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")
    : "";

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" onClick={handleClick}>
        <img src={mapImageUrl} alt="Map" className="w-full h-full object-contain" />
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {walkwayPoints && (
            <polyline
              points={walkwayPoints}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="0.6"
            />
          )}
          {blockedPolygons.map((polygon, index) => {
            const points = polygon.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");
            if (!points) return null;
            return (
              <polygon
                key={`blocked-${index}`}
                points={points}
                fill="rgba(239, 68, 68, 0.25)"
                stroke="#ef4444"
                strokeWidth="0.5"
              />
            );
          })}
          {allowedPoints && (
            <polygon
              points={allowedPoints}
              fill="rgba(34, 197, 94, 0.2)"
              stroke="#22c55e"
              strokeWidth="0.5"
            />
          )}
        </svg>

        {anchors.entrances.map((p, index) => (
          <div
            key={`entrance-${index}`}
            className="absolute w-3 h-3 rounded-full bg-blue-500 border border-white"
            style={{ left: toPercent(p.x), top: toPercent(p.y), transform: "translate(-50%, -50%)" }}
          />
        ))}
        {anchors.walkway.map((p, index) => (
          <div
            key={`walk-${index}`}
            className="absolute w-2 h-2 rounded-full bg-blue-300"
            style={{ left: toPercent(p.x), top: toPercent(p.y), transform: "translate(-50%, -50%)" }}
          />
        ))}
      </div>
    </div>
  );
}
