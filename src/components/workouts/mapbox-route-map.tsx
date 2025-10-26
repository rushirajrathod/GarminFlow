'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl, { LngLatLike } from 'mapbox-gl';
import { Maximize2, Minimize2, Pause, Play, RotateCcw } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';

type MapboxRouteMapProps = {
  coordinates: [number, number, number][];
  className?: string;
};

const MAP_STYLE = 'mapbox://styles/mapbox/outdoors-v12';
const TERRAIN_SOURCE_ID = 'mapbox-dem';
const ROUTE_SOURCE_ID = 'activity-route';
const ROUTE_LAYER_ID = 'activity-route-line';
const BASE_SPEED_METERS_PER_SECOND = 12;
const SPEED_OPTIONS = [0.75, 1, 1.5, 2.5, 4] as const;

type SpeedOption = (typeof SPEED_OPTIONS)[number];

const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
if (!accessToken) {
  console.warn(
    '[MapboxRouteMap] NEXT_PUBLIC_MAPBOX_TOKEN is not set. Mapbox map will render a placeholder.',
  );
}
mapboxgl.accessToken = accessToken;

export default function MapboxRouteMap({
  coordinates,
  className,
}: MapboxRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const animationRef = useRef<number>();
  const lastFrameRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [progressDistance, setProgressDistance] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<SpeedOption>(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const cameraStateRef = useRef<{
    point: [number, number, number];
    height: number;
  } | null>(null);

  const lngLat = useMemo(
    () =>
      coordinates.map(coord => [
        coord[1],
        coord[0],
        coord[2] ?? 0,
      ]) as [number, number, number][],
    [coordinates],
  );

  const pathMetrics = useMemo(() => {
    if (lngLat.length < 2) {
      return { totalDistance: 0, cumulative: [0] };
    }

    const cumulative: number[] = [0];
    let total = 0;

    for (let i = 1; i < lngLat.length; i += 1) {
      const prev = lngLat[i - 1];
      const curr = lngLat[i];
      total += haversineDistance(prev[1], prev[0], curr[1], curr[0]);
      cumulative.push(total);
    }

    return { totalDistance: total, cumulative };
  }, [lngLat]);

  const getPointAlongRoute = useCallback(
    (distance: number) => {
      const { cumulative } = pathMetrics;
      if (lngLat.length === 0) {
        return { point: [0, 0, 0] as [number, number, number], bearing: -20 };
      }

      if (distance <= 0) {
        const bearing = computeBearing(
          lngLat[0],
          lngLat[1] ?? lngLat[0],
        );
        return { point: lngLat[0], bearing };
      }

      const total = cumulative[cumulative.length - 1];
      if (distance >= total) {
        const last = lngLat[lngLat.length - 1];
        const bearing = computeBearing(
          lngLat[lngLat.length - 2] ?? last,
          last,
        );
        return { point: last, bearing };
      }

      let segmentIndex = cumulative.findIndex((value, index) => {
        const next = cumulative[index + 1];
        return next !== undefined && distance >= value && distance <= next;
      });

      if (segmentIndex === -1) {
        segmentIndex = cumulative.length - 2;
      }

      const segmentStartDist = cumulative[segmentIndex];
      const segmentEndDist = cumulative[segmentIndex + 1];
      const segmentLength = segmentEndDist - segmentStartDist || 1;
      const t = (distance - segmentStartDist) / segmentLength;

      const startPoint = lngLat[segmentIndex];
      const endPoint = lngLat[segmentIndex + 1];

      const interpolated: [number, number, number] = [
        lerp(startPoint[0], endPoint[0], t),
        lerp(startPoint[1], endPoint[1], t),
        lerp(startPoint[2], endPoint[2], t),
      ];

      const bearing = computeBearing(startPoint, endPoint);
      return { point: interpolated, bearing };
    },
    [lngLat, pathMetrics],
  );

  useEffect(() => {
    if (!containerRef.current || !lngLat.length || !accessToken) {
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: lngLat[0] as LngLatLike,
      zoom: 13,
      pitch: 65,
      bearing: -20,
      cooperativeGestures: true,
      antialias: true,
    });
    mapRef.current = map;

    map.on('load', () => {
      if (!map.getSource(TERRAIN_SOURCE_ID)) {
        map.addSource(TERRAIN_SOURCE_ID, {
          type: 'raster-dem',
          url: 'mapbox://mapbox.terrain-rgb',
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.65 });
      }

      map.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        'top-right',
      );

      if (!map.getSource(ROUTE_SOURCE_ID)) {
        map.addSource(ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: buildRouteGeoJSON(lngLat),
        });
      }

      if (!map.getLayer(ROUTE_LAYER_ID)) {
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#2563eb',
            'line-width': 5,
            'line-blur': 0.6,
            'line-emissive-strength': 0.3,
            'line-opacity': 0.95,
          },
        });
      }

      map.setFog({
        range: [1.2, 12],
        'horizon-blend': 0.4,
        color: 'rgba(210, 227, 255, 0.4)',
        'high-color': '#dbeafe',
        'space-color': '#f1f5f9',
        'star-intensity': 0,
      });

      map.setLight({
        anchor: 'map',
        color: '#fef3c7',
        intensity: 0.65,
        position: [1.3, 90, 80],
      });

      const labelLayerId =
        map
          .getStyle()
          ?.layers?.find(layer => {
            if (layer.type !== 'symbol') {
              return false;
            }
            const symbolLayer = layer as mapboxgl.SymbolLayer;
            return Boolean(
              symbolLayer.layout && symbolLayer.layout['text-field'],
            );
          })?.id ?? undefined;

      if (!map.getLayer('3d-buildings')) {
        map.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': '#c7d2fe',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.85,
            },
          },
          labelLayerId,
        );
      }

      if (!map.getLayer('elevated-sky')) {
        map.addLayer(
          {
            id: 'elevated-sky',
            type: 'sky',
            paint: {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0.0, 0.0],
              'sky-atmosphere-sun-intensity': 15,
              'sky-opacity': 0.9,
            },
          } as mapboxgl.AnyLayer,
        );
      }

      fitMapToRoute(map, lngLat);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      cancelAnimationFrame(animationRef.current ?? 0);
    };
  }, [lngLat]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(buildRouteGeoJSON(lngLat));
      fitMapToRoute(map, lngLat);
    }

  }, [lngLat]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const timeout = window.setTimeout(() => {
      map.resize();
      if (lngLat.length) {
        fitMapToRoute(map, lngLat);
      }
    }, 260);
    return () => window.clearTimeout(timeout);
  }, [isExpanded, lngLat]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = undefined;
    lastFrameRef.current = null;
    setIsAnimating(false);
    setProgressDistance(distanceRef.current);
  }, []);

  const animationStep = useCallback(function step(timestamp: number) {
      const map = mapRef.current;
      if (!map) return;

      if (lastFrameRef.current == null) {
        lastFrameRef.current = timestamp;
      }

      const deltaSeconds = (timestamp - lastFrameRef.current) / 1000;
      lastFrameRef.current = timestamp;

      const { totalDistance } = pathMetrics;
      const currentSpeed = BASE_SPEED_METERS_PER_SECOND * speedMultiplier;
      distanceRef.current = Math.min(
        distanceRef.current + deltaSeconds * currentSpeed,
        totalDistance,
      );
      setProgressDistance(distanceRef.current);

      const { point } = getPointAlongRoute(distanceRef.current);
      const aheadPoint = getPointAlongRoute(distanceRef.current + 40).point;
      const targetHeight = Math.max((point[2] ?? 0) + 150, 160);
      const previous = cameraStateRef.current ?? {
        point,
        height: targetHeight,
      };

      const lerpFactor = 0.12;
      const smoothedPoint: [number, number, number] = [
        lerp(previous.point[0], point[0], lerpFactor),
        lerp(previous.point[1], point[1], lerpFactor),
        lerp(previous.point[2], point[2], lerpFactor),
      ];
      const smoothedHeight = lerp(previous.height, targetHeight, lerpFactor);
      cameraStateRef.current = {
        point: smoothedPoint,
        height: smoothedHeight,
      };

      const lookAt: [number, number, number] = [
        lerp(smoothedPoint[0], aheadPoint[0], 0.85),
        lerp(smoothedPoint[1], aheadPoint[1], 0.85),
        aheadPoint[2] ?? 0,
      ];

      const camera = map.getFreeCameraOptions();
      camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
        { lng: smoothedPoint[0], lat: smoothedPoint[1] },
        smoothedHeight,
      );
      camera.lookAtPoint(lookAt);
      map.setFreeCameraOptions(camera);

      if (distanceRef.current >= totalDistance) {
        stopAnimation();
        return;
      }

      animationRef.current = requestAnimationFrame(step);
    },
    [getPointAlongRoute, pathMetrics, speedMultiplier, stopAnimation],
  );

  const startAnimation = useCallback(() => {
    if (!mapRef.current || pathMetrics.totalDistance === 0) {
      return;
    }
    cancelAnimationFrame(animationRef.current ?? 0);
    distanceRef.current = 0;
    setProgressDistance(0);
    lastFrameRef.current = null;
    setIsAnimating(true);
    cameraStateRef.current = null;
    animationRef.current = requestAnimationFrame(animationStep);
  }, [animationStep, pathMetrics.totalDistance]);

  const toggleAnimation = () => {
    if (isAnimating) {
      stopAnimation();
    } else {
      startAnimation();
    }
  };

  if (!accessToken) {
    return (
      <div
        className={cn(
          'flex min-h-[320px] w-full items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/40 text-xs text-muted-foreground',
          className,
        )}
      >
        Mapbox token missing. Set NEXT_PUBLIC_MAPBOX_TOKEN to enable 3D maps.
      </div>
    );
  }

  const hasRoute = lngLat.length > 1;
  const baseHeightClasses = 'min-h-[360px] md:min-h-[420px] lg:min-h-[520px]';
  const mapClasses = cn(
    'relative w-full overflow-hidden bg-slate-950/10 transition-all duration-300 ease-out',
    isExpanded
      ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-none shadow-none'
      : `rounded-2xl border border-border/60 shadow-lg ${baseHeightClasses}`,
    !isExpanded && className,
  );
  const placeholderClasses = cn(baseHeightClasses, className);

  return (
    <>
      {isExpanded && <div aria-hidden className={placeholderClasses} />}
      <div className={mapClasses}>
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur-md ring-1 ring-white/60 transition hover:bg-blue-100/70"
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="size-3.5" />
                  Exit full view
                </>
              ) : (
                <>
                  <Maximize2 className="size-3.5" />
                  Fullscreen
                </>
              )}
            </button>
          </div>

          <div className="flex justify-center pb-2 sm:pb-5">
            <div className="pointer-events-auto flex w-full max-w-md flex-col items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur-md ring-1 ring-white/60">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={toggleAnimation}
                  className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-white shadow-md transition hover:bg-blue-500 disabled:opacity-50"
                  disabled={!hasRoute}
                >
                  {isAnimating ? (
                    <>
                      <Pause className="size-3.5" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5" /> Flyover
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopAnimation();
                    distanceRef.current = 0;
                    setProgressDistance(0);
                    cameraStateRef.current = null;
                    if (mapRef.current && lngLat.length) {
                      fitMapToRoute(mapRef.current, lngLat);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3.5 py-1.5 text-slate-600 transition hover:bg-blue-50 disabled:opacity-50"
                  disabled={!hasRoute}
                >
                  <RotateCcw className="size-3.5" /> Reset
                </button>
              </div>
              <SpeedControls
                speedMultiplier={speedMultiplier}
                onChange={value => {
                  setSpeedMultiplier(value);
                  if (!isAnimating) {
                    cameraStateRef.current = null;
                  }
                }}
              />
              <ProgressBar
                progress={
                  pathMetrics.totalDistance > 0
                    ? progressDistance / pathMetrics.totalDistance
                    : 0
                }
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div className="pointer-events-none h-1.5 w-60 overflow-hidden rounded-full bg-slate-200/80 shadow-inner">
      <div
        className="h-full rounded-full bg-blue-500 transition-[width]"
        style={{ width: `${(clamped * 100).toFixed(1)}%` }}
      />
    </div>
  );
}

function SpeedControls({
  speedMultiplier,
  onChange,
}: {
  speedMultiplier: SpeedOption;
  onChange: (value: SpeedOption) => void;
}) {
  return (
    <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-lg backdrop-blur-xl ring-1 ring-slate-200">
      {SPEED_OPTIONS.map(option => {
        const active = option === speedMultiplier;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              'rounded-full px-2.5 py-1 transition',
              active
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:bg-blue-100',
            )}
          >
            {formatSpeed(option)}x
          </button>
        );
      })}
    </div>
  );
}

function formatSpeed(value: number) {
  if (Number.isInteger(value)) {
    return value.toFixed(0);
  }
  const formatted =
    value < 1 ? value.toFixed(2) : value.toFixed(1);
  return formatted.replace(/0+$/, '').replace(/\.$/, '');
}

function buildRouteGeoJSON(coordinates: [number, number, number][]) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: coordinates.map(coord => [coord[0], coord[1], coord[2]]),
    },
  };
}

function fitMapToRoute(
  map: mapboxgl.Map,
  coordinates: [number, number, number][],
) {
  if (!coordinates.length) return;

  const bounds = coordinates.reduce(
    (acc, coord) => acc.extend([coord[0], coord[1]]),
    new mapboxgl.LngLatBounds(
      [coordinates[0][0], coordinates[0][1]],
      [coordinates[0][0], coordinates[0][1]],
    ),
  );

  map.fitBounds(bounds, {
    padding: 48,
    duration: 0,
  });
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function computeBearing(
  start: [number, number, number],
  end: [number, number, number],
) {
  const startLat = toRadians(start[1]);
  const startLng = toRadians(start[0]);
  const endLat = toRadians(end[1]);
  const endLng = toRadians(end[0]);

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);

  const bearing = (toDegrees(Math.atan2(y, x)) + 360) % 360;
  return bearing;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}
