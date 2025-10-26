import { ChatInterface } from '@/components/chat/chat-interface';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getKeyMetrics,
  getNextRacePlan,
  getRecentWorkouts,
} from '@/lib/garmin-data';

export default async function ChatPage() {
  const [metrics, racePlan, recentWorkouts] = await Promise.all([
    getKeyMetrics(),
    getNextRacePlan(),
    getRecentWorkouts(3),
  ]);

  const weeklyDistanceMetric = metrics.find(
    metric => metric.id === 'weekly-distance',
  );
  const heartRateMetric = metrics.find(metric => metric.id === 'avg-hr');

  const readinessScore = heartRateMetric
    ? Math.max(
        40,
        Math.min(
          95,
          110 - Number.parseInt(heartRateMetric.value, 10) || 0,
        ),
      )
    : 60;

  const chatContext = {
    readinessScore,
    weeklyDistance: weeklyDistanceMetric?.value ?? '--',
    nextRace: racePlan.name,
  };

  const raceDate = racePlan.date ? new Date(racePlan.date) : undefined;

  const presets = [
    'How should I taper in the final 10 days before race day?',
    'Do my recent long runs line up with the goal half-marathon pace?',
    'What recovery tweaks do you recommend after yesterday’s threshold session?',
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>AI coach</CardTitle>
          <CardDescription>
            Converse with ChatGPT using Garmin-specific context, metrics, and workouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChatInterface context={chatContext} presets={presets} />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Session snapshot</CardTitle>
            <CardDescription>
              Latest Garmin metrics forwarded to the assistant as structured context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Key metrics
              </span>
              <div className="grid gap-3">
                {metrics.slice(0, 3).map(metric => (
                  <div
                    key={metric.id}
                    className="rounded-2xl border border-border/60 p-3"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {metric.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{metric.delta}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Next race
              </span>
              <div className="rounded-2xl border border-border/60 p-4">
                <p className="text-sm font-semibold text-foreground">
                  {racePlan.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {raceDate
                    ? raceDate.toLocaleDateString(undefined, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Date TBD'}{' '}
                  • {racePlan.location}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Target {racePlan.targetTime}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {racePlan.focusBlocks.map(block => (
                    <Badge key={block.label} variant="secondary" className="rounded-full">
                      {block.label} · {block.weeks}w
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Recent workouts pushed to chat</CardTitle>
            <CardDescription>
              Highlighted sessions provided to the assistant for quick reference.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {recentWorkouts.map(workout => (
              <div key={workout.id} className="rounded-2xl border border-border/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {workout.title}
                  </p>
                  <Badge variant="outline" className="capitalize">
                    {workout.type.toLowerCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(workout.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  • {workout.distanceKm.toFixed(1)} km • Load{' '}
                  {workout.trainingLoad ?? '—'}
                </p>
                {workout.notes && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {workout.notes}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
