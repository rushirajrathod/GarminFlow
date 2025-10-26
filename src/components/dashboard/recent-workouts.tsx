'use client';

import Link from 'next/link';
import { Activity, Flame, HeartPulse, Timer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Workout } from '@/types/garmin';

type RecentWorkoutsProps = {
  workouts: Workout[];
};

export function RecentWorkouts({ workouts }: RecentWorkoutsProps) {
  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Recent sessions</CardTitle>
          <CardDescription>
            Highlights from the last few Garmin activities.
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/workouts">Open log</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {workouts.map(workout => (
            <article
              key={workout.id}
              className="rounded-2xl border border-border/70 px-4 py-3 transition-colors hover:border-border"
            >
              <div className="flex flex-wrap items-start gap-3">
                <Badge variant="outline" className="capitalize">
                  {workout.type.toLowerCase()}
                </Badge>
                <h3 className="text-sm font-semibold text-foreground">
                  {workout.title}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {new Date(workout.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {Number.isFinite(workout.distanceKm)
                  ? `${workout.distanceKm.toFixed(1)} km`
                  : 'Distance n/a'}{' '}
                • {workout.averagePace ?? 'pace n/a'}
              </p>
              <div className="mt-3 grid gap-4 text-sm text-muted-foreground md:grid-cols-4">
                <InfoChip icon={<Timer className="size-3.5" />} label="Time">
                  {Math.round(workout.durationMinutes)} min
                </InfoChip>
                <InfoChip icon={<Flame className="size-3.5" />} label="Load">
                  {workout.trainingLoad ?? Math.round(
                    (workout.moderateMinutes ?? 0) +
                      (workout.vigorousMinutes ?? 0),
                  )}
                </InfoChip>
                <InfoChip icon={<Activity className="size-3.5" />} label="Type">
                  {workout.type}
                </InfoChip>
                <InfoChip icon={<HeartPulse className="size-3.5" />} label="Heart rate">
                  {workout.averageHeartRate
                    ? `${workout.averageHeartRate} bpm`
                    : '—'}
                </InfoChip>
              </div>
              {workout.notes && (
                <p className="mt-2 text-sm text-muted-foreground/90">
                  {workout.notes}
                </p>
              )}
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoChip({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground">
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{children}</span>
      </div>
    </div>
  );
}
