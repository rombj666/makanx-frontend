import React, { useEffect, useRef, useState } from "react";

// Helper for clamping zoom
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

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

interface OrganizerMapCanvasProps {
  mapImageUrl: string | null;
  mapWidth?: number;
  mapHeight?: number;
  booths: Booth[];
  selectedBoothId: string | null;
  onBoothSelect: (boothId: string | null) => void;
  onBoothUpdate: (boothId: string, updates: Partial<Booth>) => void; // Called on drag/resize end
  layoutVersion: number;
  // Expose current view center for "Add Booth"
  onViewChange?: (center: { x: number; y: number }) => void;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;

export default function OrganizerMapCanvas({
  mapImageUrl,
  mapWidth,
  mapHeight,
  booths,
  selectedBoothId,
  onBoothSelect,
  onBoothUpdate,
  layoutVersion,
  onViewChange,
}: OrganizerMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  
  // Dragging Booth State
  const [draggingBooth, setDraggingBooth] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    mode: "move" | "resize";
    origW: number;
    origH: number;
  } | null>(null);

  // Temporary booth state for smooth rendering during drag
  const [tempBoothState, setTempBoothState] = useState<Partial<Booth> | null>(null);

  // Initialize view (center map)
  useEffect(() => {
    if (mapImageUrl) {
      // Reset view when map changes (optional, maybe keep position if just version changed?)
      // For now, let's just fit to view if it's the first load or map image changes
      const img = new Image();
      img.src = mapImageUrl;
      img.onload = () => {
        const cw = containerRef.current!.clientWidth;
        const ch = containerRef.current!.clientHeight;

        const iw = mapWidth ?? img.width;
        const ih = mapHeight ?? img.height;

        const scale = clamp(Math.min(cw / iw, ch / ih), MIN_SCALE, 1); // fit but don’t zoom in too much
        const x = (cw - iw * scale) / 2;
        const y = (ch - ih * scale) / 2;

        setTransform({ x, y, scale });
        updateViewCenter(x, y, scale);
      };
    }
  }, [mapImageUrl, mapWidth, mapHeight]);

  // --- Helper to resolve coordinates ---
    const getBoothRect = (b: Booth) => {
      const hasNorm =
        mapWidth &&
        mapHeight &&
        b.posXNorm !== undefined &&
        b.posYNorm !== undefined &&
        b.widthNorm !== undefined &&
        b.heightNorm !== undefined;

      if (hasNorm) {
        return {
          x: b.posXNorm! * mapWidth!,
          y: b.posYNorm! * mapHeight!,
          w: b.widthNorm! * mapWidth!,
          h: b.heightNorm! * mapHeight!,
        };
      }

      return { x: b.posX, y: b.posY, w: b.width, h: b.height };
    };

  // --- Map Pan/Zoom Logic (Similar to Customer Map) ---
  const lastMapPos = useRef<{ x: number; y: number } | null>(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const delta = -e.deltaY * 0.001;
    const newScale = clamp(transform.scale * (1 + delta), MIN_SCALE, MAX_SCALE);

    const scaleRatio = newScale / transform.scale;
    
    // Zoom around cursor
    const newX = cx - (cx - transform.x) * scaleRatio;
    const newY = cy - (cy - transform.y) * scaleRatio;

    setTransform({ x: newX, y: newY, scale: newScale });
    updateViewCenter(newX, newY, newScale);
  };

  const handleMapPointerDown = (e: React.PointerEvent) => {
    if (draggingBooth) return; // Don't drag map if dragging booth
    containerRef.current?.setPointerCapture(e.pointerId);
    setIsDraggingMap(true);
    lastMapPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMapPointerMove = (e: React.PointerEvent) => {
    if (isDraggingMap && lastMapPos.current) {
      const dx = e.clientX - lastMapPos.current.x;
      const dy = e.clientY - lastMapPos.current.y;
      lastMapPos.current = { x: e.clientX, y: e.clientY };
      
      const newX = transform.x + dx;
      const newY = transform.y + dy;
      setTransform({ ...transform, x: newX, y: newY });
      updateViewCenter(newX, newY, transform.scale);
    }
  };

  const handleMapPointerUp = (e: React.PointerEvent) => {
    setIsDraggingMap(false);
    lastMapPos.current = null;
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  const updateViewCenter = (x: number, y: number, scale: number) => {
    if (!containerRef.current || !onViewChange) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = (rect.width / 2 - x) / scale;
    const centerY = (rect.height / 2 - y) / scale;
    onViewChange({ x: centerX, y: centerY });
  };

  // --- Booth Drag/Resize Logic ---
  
  const handleBoothPointerDown = (e: React.PointerEvent, booth: Booth, mode: "move" | "resize") => {
    e.stopPropagation(); // Stop map drag
    e.preventDefault();
    
    // Select the booth
    onBoothSelect(booth.id);

    const rect = getBoothRect(booth);

    setDraggingBooth({
      id: booth.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.x,
      origY: rect.y,
      mode,
      origW: rect.w,
      origH: rect.h,
    });
    
    // Capture pointer on the booth element or container? 
    // Capturing on container is safer for fast drags
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handleGlobalPointerMove = (e: React.PointerEvent) => {
    if (!draggingBooth) {
      // If dragging map, handle it here? 
      // Actually we handled map drag in onPointerMove of container. 
      // But if we use setPointerCapture, the container events will fire.
      if (isDraggingMap) handleMapPointerMove(e);
      return;
    }

    const dx = (e.clientX - draggingBooth.startX) / transform.scale;
    const dy = (e.clientY - draggingBooth.startY) / transform.scale;

    if (draggingBooth.mode === "move") {
      setTempBoothState({
        posX: Math.round(draggingBooth.origX + dx),
        posY: Math.round(draggingBooth.origY + dy),
      });
    } else {
      // resize
      setTempBoothState({
        width: Math.max(20, Math.round(draggingBooth.origW + dx)),
        height: Math.max(20, Math.round(draggingBooth.origH + dy)),
      });
    }
  };

  const handleGlobalPointerUp = (e: React.PointerEvent) => {
    if (isDraggingMap) {
      handleMapPointerUp(e);
      return;
    }

    if (draggingBooth) {
      // Commit changes
      if (tempBoothState) {
        const finalUpdates: Partial<Booth> = { ...tempBoothState };

        // Calculate Normalized if map dimensions exist
        if (mapWidth && mapHeight) {
             const finalX = tempBoothState.posX ?? draggingBooth.origX;
             const finalY = tempBoothState.posY ?? draggingBooth.origY;
             const finalW = tempBoothState.width ?? draggingBooth.origW;
             const finalH = tempBoothState.height ?? draggingBooth.origH;

             finalUpdates.posXNorm = finalX / mapWidth;
             finalUpdates.posYNorm = finalY / mapHeight;
             finalUpdates.widthNorm = finalW / mapWidth;
             finalUpdates.heightNorm = finalH / mapHeight;
        }

        onBoothUpdate(draggingBooth.id, finalUpdates);
      }
      setDraggingBooth(null);
      setTempBoothState(null);
      containerRef.current?.releasePointerCapture(e.pointerId);
    }
  };

  // --- Render ---

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-gray-200 relative overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onPointerDown={handleMapPointerDown}
      onPointerMove={handleGlobalPointerMove}
      onPointerUp={handleGlobalPointerUp}
      // Mobile prevent scroll
      style={{ touchAction: "none" }} 
    >
      {/* Map Content Layer */}
      <div
        className="absolute origin-top-left will-change-transform"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        {mapImageUrl && (
          <img
            src={mapImageUrl}
            alt="Event Map"
            className="pointer-events-none select-none max-w-none"
            style={{
              width: mapWidth ? `${mapWidth}px` : undefined,
              height: mapHeight ? `${mapHeight}px` : undefined,
            }}
            onDragStart={(e) => e.preventDefault()}
          />
        )}

        {/* Booths */}
        {booths.map((booth) => {
          const isSelected = selectedBoothId === booth.id;
          const isDragging = draggingBooth?.id === booth.id;
          const rect = getBoothRect(booth);
          
          // Apply temp state if dragging this booth
          const displayX = isDragging && tempBoothState?.posX !== undefined ? tempBoothState.posX : rect.x;
          const displayY = isDragging && tempBoothState?.posY !== undefined ? tempBoothState.posY : rect.y;
          const displayW = isDragging && tempBoothState?.width !== undefined ? tempBoothState.width : rect.w;
          const displayH = isDragging && tempBoothState?.height !== undefined ? tempBoothState.height : rect.h;

          return (
            <div
              key={booth.id}
              className={`absolute border-2 flex items-center justify-center text-xs font-bold overflow-visible
                ${isSelected ? "border-orange-500 z-20" : "border-blue-500 bg-white/50 z-10"}
                ${booth.vendor ? "bg-green-100/80" : "bg-white/80"}
              `}
              style={{
                left: `${displayX}px`,
                top: `${displayY}px`,
                width: `${displayW}px`,
                height: `${displayH}px`,
                cursor: isDragging ? "grabbing" : "pointer",
              }}
              onPointerDown={(e) => handleBoothPointerDown(e, booth, "move")}
            >
              <div className="pointer-events-none select-none text-center p-1 truncate w-full">
                {booth.label}
                {booth.vendor && <div className="text-[10px] font-normal">{booth.vendor.name}</div>}
              </div>

              {/* Resize Handle (only when selected) */}
              {isSelected && (
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-orange-500 cursor-se-resize z-30"
                  onPointerDown={(e) => handleBoothPointerDown(e, booth, "resize")}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Controls Overlay (Zoom Buttons) - Optional but good for UX */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
         <button 
           className="bg-white p-2 shadow rounded hover:bg-gray-100"
           onClick={() => setTransform(t => ({ ...t, scale: clamp(t.scale * 1.2, MIN_SCALE, MAX_SCALE) }))}
         >
           +
         </button>
         <button 
           className="bg-white p-2 shadow rounded hover:bg-gray-100"
           onClick={() => setTransform(t => ({ ...t, scale: clamp(t.scale / 1.2, MIN_SCALE, MAX_SCALE) }))}
         >
           -
         </button>
      </div>
    </div>
  );
}
