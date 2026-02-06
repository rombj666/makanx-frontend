import React, { useEffect, useMemo, useRef, useState } from "react";

type Booth = {
  id: string;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  posXNorm?: number;
  posYNorm?: number;
  widthNorm?: number;
  heightNorm?: number;
  vendor?: { id: string; name: string } | null;
};

interface MapCanvasProps {
  mapImageUrl: string | null;
  mapWidth?: number | null;
  mapHeight?: number | null;
  booths: Booth[];
  activeVendorId: string | null;
  onBoothClick: (vendorId: string | null) => void;
  layoutVersion: number;
  viewOnly?: boolean;
  boothWaitMin?: Record<string, number>;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const TAP_MOVE_PX = 8; // if finger moved <= this, treat as tap

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function MapCanvas({
  mapImageUrl,
  mapWidth,
  mapHeight,
  booths,
  activeVendorId,
  onBoothClick,
  layoutVersion,
  viewOnly = false,
  boothWaitMin,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [naturalMapSize, setNaturalMapSize] = useState<{ w: number; h: number } | null>(null);
  const mapW = mapWidth ?? naturalMapSize?.w ?? 1000;
  const mapH = mapHeight ?? naturalMapSize?.h ?? 1000;

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  // For drag / pinch
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const startRef = useRef<{
    mode: "none" | "maybe-drag" | "drag" | "pinch";
    startX: number;
    startY: number;
    startTransform: { x: number; y: number; scale: number };
    pinchStartDist: number;
    pinchStartMid: { x: number; y: number };
  }>({
    mode: "none",
    startX: 0,
    startY: 0,
    startTransform: { x: 0, y: 0, scale: 1 },
    pinchStartDist: 0,
    pinchStartMid: { x: 0, y: 0 },
  });

  // For booth tap (fixes “top half doesn’t work” + “second tap glitch”)
  const boothTapRef = useRef<{
    boothId: string;
    vendorId: string | null;
    downX: number;
    downY: number;
  } | null>(null);

  const activeBoothId = useMemo(() => {
    if (!activeVendorId) return null;
    const b = booths.find((x) => x.vendor?.id === activeVendorId);
    return b?.id ?? null;
  }, [booths, activeVendorId]);

  const getBoothRect = (booth: Booth) => {
    const hasNorm =
      booth.posXNorm !== undefined &&
      booth.posYNorm !== undefined &&
      booth.widthNorm !== undefined &&
      booth.heightNorm !== undefined;

    if (hasNorm) {
      return {
        x: booth.posXNorm! * mapW,
        y: booth.posYNorm! * mapH,
        w: booth.widthNorm! * mapW,
        h: booth.heightNorm! * mapH,
      };
    }

    return { x: booth.posX, y: booth.posY, w: booth.width, h: booth.height };
  };

  const fitToView = () => {
    const el = containerRef.current;
    if (!el) return;

    const cw = el.clientWidth;
    const ch = el.clientHeight;

    const scale = clamp(Math.min(cw / mapW, ch / mapH), MIN_SCALE, MAX_SCALE);

    const x = (cw - mapW * scale) / 2;
    const y = (ch - mapH * scale) / 2;

    setTransform({ x, y, scale });
  };

  useEffect(() => {
    if (!mapImageUrl) return;
    const img = new Image();
    img.src = mapImageUrl;
    img.onload = () => {
      setNaturalMapSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
  }, [mapImageUrl]);

  // Reset/fit when layout changes
  useEffect(() => {
    fitToView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutVersion, mapImageUrl, mapW, mapH]);

  // Focus on active vendor (center + small zoom)
  useEffect(() => {
    if (viewOnly) return; // Disable auto-zoom in view-only mode (e.g. Vendor Map)
    
    const el = containerRef.current;
    if (!el) return;
    if (!activeVendorId) return;

    const booth = booths.find((b) => b.vendor?.id === activeVendorId);
    if (!booth) return;

    const cw = el.clientWidth;
    const ch = el.clientHeight;

    const targetScale = clamp(1.2, MIN_SCALE, MAX_SCALE);

    const rect = getBoothRect(booth);
    const boothCx = rect.x + rect.w / 2;
    const boothCy = rect.y + rect.h / 2;

    const x = cw / 2 - boothCx * targetScale;
    const y = ch / 2 - boothCy * targetScale;

    setTransform({ x, y, scale: targetScale });
  }, [activeVendorId, booths]);

  const setScaleAround = (newScale: number, centerX: number, centerY: number) => {
    setTransform((prev) => {
      const scale = clamp(newScale, MIN_SCALE, MAX_SCALE);

      // Keep the point under finger stable:
      // world = (screen - translate) / scale
      const worldX = (centerX - prev.x) / prev.scale;
      const worldY = (centerY - prev.y) / prev.scale;

      const x = centerX - worldX * scale;
      const y = centerY - worldY * scale;

      return { x, y, scale };
    });
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const delta = -e.deltaY * 0.001;
    const next = transform.scale * (1 + delta);

    setScaleAround(next, cx, cy);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;

    // capture pointer
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pts = Array.from(pointersRef.current.values());

    // 2 fingers => pinch
    if (pts.length >= 2) {
      const [p1, p2] = pts;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);

      const rect = el.getBoundingClientRect();
      const mid = {
        x: (p1.x + p2.x) / 2 - rect.left,
        y: (p1.y + p2.y) / 2 - rect.top,
      };

      startRef.current = {
        mode: "pinch",
        startX: 0,
        startY: 0,
        startTransform: transform,
        pinchStartDist: dist,
        pinchStartMid: mid,
      };
      return;
    }

    // 1 finger => maybe-drag (only start drag after threshold)
    startRef.current = {
      mode: "maybe-drag",
      startX: e.clientX,
      startY: e.clientY,
      startTransform: transform,
      pinchStartDist: 0,
      pinchStartMid: { x: 0, y: 0 },
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;

    if (!pointersRef.current.has(e.pointerId)) return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const mode = startRef.current.mode;
    const pts = Array.from(pointersRef.current.values());

    // Pinch zoom
    if (pts.length >= 2 && mode === "pinch") {
      const [p1, p2] = pts;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);

      const ratio = dist / (startRef.current.pinchStartDist || 1);
      const nextScale = clamp(startRef.current.startTransform.scale * ratio, MIN_SCALE, MAX_SCALE);

      // zoom around pinch midpoint
      setScaleAround(nextScale, startRef.current.pinchStartMid.x, startRef.current.pinchStartMid.y);
      return;
    }

    // Drag with 1 pointer
    if (pts.length === 1) {
      const dx = e.clientX - startRef.current.startX;
      const dy = e.clientY - startRef.current.startY;

      if (startRef.current.mode === "maybe-drag") {
        // only start drag if moved enough
        if (Math.abs(dx) > TAP_MOVE_PX || Math.abs(dy) > TAP_MOVE_PX) {
          startRef.current.mode = "drag";
        } else {
          return; // still tap-ish
        }
      }

      if (startRef.current.mode === "drag") {
        setTransform({
          x: startRef.current.startTransform.x + dx,
          y: startRef.current.startTransform.y + dy,
          scale: startRef.current.startTransform.scale,
        });
      }
    }
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);

    const pts = Array.from(pointersRef.current.values());
    if (pts.length >= 2) {
      // still pinching with others
      return;
    }
    // reset mode when finished
    startRef.current.mode = "none";
  };

  const zoomIn = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setScaleAround(transform.scale + 0.2, rect.width / 2, rect.height / 2);
  };

  const zoomOut = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setScaleAround(transform.scale - 0.2, rect.width / 2, rect.height / 2);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gray-200 overflow-hidden relative"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
      style={{
        touchAction: "none", // IMPORTANT for mobile pinch/drag
      }}
    >
      <div
        className="relative"
        style={{
          width: `${mapW}px`,
          height: `${mapH}px`,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          // avoid “jumping” on mobile
          willChange: "transform",
        }}
      >
        {mapImageUrl && (
          <img
            src={mapImageUrl}
            alt="Event Map"
            className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none select-none"
            draggable={false}
          />
        )}

        {booths.map((booth) => {
          const vendorId = booth.vendor?.id ?? null;
          const isActive = booth.id === activeBoothId;
          const rect = getBoothRect(booth);

          return (
            <div
              key={booth.id}
              className={`absolute border-2 flex items-center justify-center text-xs font-bold shadow-sm transition-all select-none
                ${vendorId ? "cursor-pointer" : "cursor-default"}
                ${
                  isActive
                    ? "border-orange-600 bg-orange-100 z-10 scale-110 ring-4 ring-orange-300"
                    : "border-blue-500 bg-white/80 hover:bg-blue-50"
                }`}
              style={{
                left: `${rect.x}px`,
                top: `${rect.y}px`,
                width: `${rect.w}px`,
                height: `${rect.h}px`,
                touchAction: "none", // IMPORTANT (so tap doesn’t become scroll)
              }}
              onPointerDown={(e) => {
                // stop map drag from starting immediately
                e.stopPropagation();
                boothTapRef.current = {
                  boothId: booth.id,
                  vendorId,
                  downX: e.clientX,
                  downY: e.clientY,
                };
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                const tap = boothTapRef.current;
                boothTapRef.current = null;

                if (!tap) return;

                const movedX = Math.abs(e.clientX - tap.downX);
                const movedY = Math.abs(e.clientY - tap.downY);

                // treat as a TAP only if finger didn't move
                if (movedX <= TAP_MOVE_PX && movedY <= TAP_MOVE_PX) {
                  onBoothClick(tap.vendorId); // <-- ALWAYS triggers selection
                }
              }}
            >
              {booth.vendor ? (
                <div className="text-center p-1">
                  <div className="truncate">{booth.vendor.name}</div>
                  {boothWaitMin && boothWaitMin[booth.id] !== undefined && (
                    <div className="text-[10px] text-gray-600">{`~${Math.round(boothWaitMin[booth.id])} min`}</div>
                  )}
                </div>
              ) : (
                <span className="text-gray-400">{booth.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="absolute bottom-20 right-4 flex flex-col gap-2 z-20">
        <button
          className="bg-white p-2 rounded shadow hover:bg-gray-100"
          onClick={zoomIn}
          type="button"
        >
          +
        </button>
        <button
          className="bg-white p-2 rounded shadow hover:bg-gray-100"
          onClick={zoomOut}
          type="button"
        >
          -
        </button>
        <button
          className="bg-white px-3 py-2 rounded shadow hover:bg-gray-100 text-sm"
          onClick={fitToView}
          type="button"
        >
          Fit
        </button>
      </div>
    </div>
  );
}
