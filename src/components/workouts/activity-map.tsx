'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const RouteMap3D = dynamic(() => import('./mapbox-route-map'), {
  ssr: false,
});

type ActivityMapProps = {
  activityId: string;
  className?: string;
};

type CoordinatesResponse = {
  coordinates?: [number, number, number][];
};

export function ActivityMap({ activityId, className }: ActivityMapProps) {
  const [coordinates, setCoordinates] = useState<
    [number, number, number][] | null
  >(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'empty'>(
    'loading',
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCoordinates() {
      if (!activityId) {
        setStatus('empty');
        setCoordinates([]);
        return;
      }

      try {
        setStatus('loading');
        const response = await fetch(`/api/workouts/${activityId}/map`);
        if (!response.ok) {
          throw new Error(`Failed to load map for activity ${activityId}`);
        }

        const data = (await response.json()) as CoordinatesResponse;
        if (cancelled) return;

        const coords = Array.isArray(data.coordinates)
          ? (data.coordinates as [number, number, number][])
          : [];

        setCoordinates(coords);
        setStatus(coords.length > 0 ? 'idle' : 'empty');
      } catch (error) {
        if (!cancelled) {
          console.warn('[ActivityMap] Unable to load coordinates', error);
          setCoordinates([]);
          setStatus('error');
        }
      }
    }

    loadCoordinates();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  if (status === 'loading') {
    return (
      <div
        className={cn(
          'flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/40 text-xs text-muted-foreground',
          className,
        )}
      >
        Loading route…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        className={cn(
          'flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-destructive/60 bg-muted/40 text-xs text-muted-foreground',
          className,
        )}
      >
        Unable to load map for this activity.
      </div>
    );
  }

  if (status === 'empty' || !coordinates?.length) {
    return (
      <div
        className={cn(
          'flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/40 text-xs text-muted-foreground',
          className,
        )}
      >
        No GPS trace available for this activity.
      </div>
    );
  }

  return <RouteMap3D coordinates={coordinates} className={className} />;
}
