import { ChatInterface } from '@/components/chat/chat-interface';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  getKeyMetrics,
  getNextRacePlan,
} from '@/lib/garmin-data';

export default async function ChatPage() {
  const [metrics, racePlan] = await Promise.all([
    getKeyMetrics(),
    getNextRacePlan(),
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 py-8">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl font-semibold">AI Coach</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Ask about pacing, recovery, or training strategy. Readiness {readinessScore} · Weekly
            distance {chatContext.weeklyDistance}{' '}
            {raceDate
              ? `· ${racePlan.name} on ${raceDate.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}`
              : `· ${racePlan.name}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ChatInterface context={chatContext} />
        </CardContent>
      </Card>
    </div>
  );
}
