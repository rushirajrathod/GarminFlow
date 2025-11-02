import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkoutTable } from '@/components/workouts/workout-table';
import { getWorkoutSummary, getWorkouts } from '@/lib/garmin-data';

export default async function WorkoutsPage() {
  const [workouts, summary] = await Promise.all([
    getWorkouts(),
    getWorkoutSummary(),
  ]);

  const totalHours = summary.totalDuration / 60;
  const longestSession = summary.longestSession;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by workout, location, or tag…"
          className="w-full max-w-xs"
        />
        <Button variant="outline">Filters</Button>
        {/* <Button variant="outline">Export</Button> */}
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last 7 days distance
            </CardTitle>
            <CardDescription>
              Based on synced Garmin runs, rides, and cross training.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {summary.weekDistance.toFixed(1)} km
            </p>
            <p className="text-xs text-muted-foreground">
              Longest session{' '}
              {longestSession
                ? `${longestSession.distanceKm.toFixed(1)} km`
                : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total duration
            </CardTitle>
            <CardDescription>
              Cumulative training time in the current block.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {totalHours.toFixed(1)} h
            </p>
            <p className="text-xs text-muted-foreground">
              Average load {summary.averageLoad.toFixed(0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quality sessions
            </CardTitle>
            <CardDescription>
              Workouts with training load &ge; 130 in the last 14 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {summary.qualitySessions}
            </p>
            <p className="text-xs text-muted-foreground">
              Keep 2–3 key workouts per week for freshness.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Longest run
            </CardTitle>
            <CardDescription>
              {longestSession?.title ?? 'No activities yet'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-2xl font-semibold text-foreground">
              {longestSession
                ? `${longestSession.distanceKm.toFixed(1)} km`
                : '—'}
            </p>
            <p className="text-muted-foreground">
              {longestSession
                ? `${Math.round(longestSession.durationMinutes)} min • ${
                    longestSession.averagePace ?? 'pace n/a'
                  }`
                : 'Import more Garmin data to populate this insight.'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {longestSession
                ? longestSession.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="rounded-full">
                      {tag}
                    </Badge>
                  ))
                : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>Workout log</CardTitle>
          <CardDescription>
            Explore rich Garmin session details with splits and training load.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorkoutTable workouts={workouts} />
        </CardContent>
      </Card>
    </div>
  );
}
