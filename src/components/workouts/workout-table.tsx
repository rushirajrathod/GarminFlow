'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, Flame, MapPin, Timer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Workout } from '@/types/garmin';
import { ActivityMap } from '@/components/workouts/activity-map';

type WorkoutTableProps = {
  workouts: Workout[];
};

type SortKey = 'date' | 'type' | 'distanceKm' | 'trainingLoad';

export function WorkoutTable({ workouts }: WorkoutTableProps) {
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedWorkouts = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => {
      const getValue = (workout: Workout) => {
        switch (sortKey) {
          case 'date':
            return new Date(workout.date).getTime();
          case 'type':
            return workout.type;
          case 'distanceKm':
            return workout.distanceKm;
          case 'trainingLoad':
            return workout.trainingLoad ?? 0;
        }
      };

      const aValue = getValue(a);
      const bValue = getValue(b);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return sorted;
  }, [workouts, sortKey, sortDirection]);

  const selectedWorkout = sortedWorkouts.find(
    workout => workout.id === selectedWorkoutId,
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('desc');
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border/70">
        <table className="min-w-full divide-y divide-border/70">
          <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <Th label="Date" onClick={() => handleSort('date')} />
              <Th label="Type" onClick={() => handleSort('type')} />
              <th className="px-4 py-3">Session</th>
              <Th label="Distance" onClick={() => handleSort('distanceKm')} />
              <th className="px-4 py-3">Duration</th>
              <Th label="Load" onClick={() => handleSort('trainingLoad')} />
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            {sortedWorkouts.map(workout => (
              <tr
                key={workout.id}
                className="transition-colors hover:bg-muted/40"
              >
                <td className="px-4 py-3">
                  {new Date(workout.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="capitalize">
                    {workout.type.toLowerCase()}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">
                    {workout.title}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {workout.location ?? '—'}
                  </p>
                </td>
                <td className="px-4 py-3">{workout.distanceKm.toFixed(1)} km</td>
                <td className="px-4 py-3">{Math.round(workout.durationMinutes)} min</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">
                    {workout.trainingLoad ?? '—'}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {workout.averageHeartRate
                      ? `${workout.averageHeartRate} bpm avg`
                      : '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {workout.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="rounded-full">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Dialog onOpenChange={open => !open && setSelectedWorkoutId(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedWorkoutId(workout.id)}
                      >
                        Open
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      {selectedWorkout ? (
                        <>
                          <DialogHeader className="space-y-1">
                            <DialogTitle>{selectedWorkout.title}</DialogTitle>
                            <DialogDescription>
                              {new Date(selectedWorkout.date).toLocaleString(undefined, {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                              })}{' '}
                              • {selectedWorkout.location ?? '—'}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/40 p-4 text-sm">
                            <Info icon={<Timer className="size-4" />} label="Duration">
                              {Math.round(selectedWorkout.durationMinutes)} min
                            </Info>
                            <Info icon={<Flame className="size-4" />} label="Training load">
                              {selectedWorkout.trainingLoad ?? '—'}
                            </Info>
                            <Info icon={<Flame className="size-4" />} label="Calories">
                              {selectedWorkout.calories ?? '—'}
                            </Info>
                            <Info icon={<MapPin className="size-4" />} label="Pace / HR">
                              {selectedWorkout.averagePace ?? 'pace n/a'} •{' '}
                              {selectedWorkout.averageHeartRate
                                ? `${selectedWorkout.averageHeartRate} bpm`
                                : 'HR n/a'}
                            </Info>
                          </div>
                          {selectedWorkout.hasRoute ? (
                            <ActivityMap
                              activityId={selectedWorkout.id}
                              className="mt-4"
                            />
                          ) : (
                            <div className="mt-4 flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/40 text-xs text-muted-foreground">
                              No GPS trace available for this activity.
                            </div>
                          )}
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-foreground">
                              Splits
                            </h4>
                            <div className="grid gap-2 md:grid-cols-2">
                              {selectedWorkout.splits.map(split => (
                                <div
                                  key={`${selectedWorkout.id}-${split.segment}`}
                                  className="rounded-lg border border-border/60 p-3 text-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-foreground">
                                      {split.segment}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {split.distanceKm.toFixed(1)} km
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Pace {split.pace}</span>
                                    <span>HR {split.heartRate} bpm</span>
                                  </div>
                                  {split.notes && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {split.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          {selectedWorkout.notes && (
                            <p className="text-sm text-muted-foreground">
                              {selectedWorkout.notes}
                            </p>
                          )}
                        </>
                      ) : null}
                    </DialogContent>
                  </Dialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Th({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
        <ArrowUpDown className="size-3.5" />
      </button>
    </th>
  );
}

function Info({
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
        <span className="text-sm font-medium text-foreground">{children}</span>
      </div>
    </div>
  );
}
