import { Flame, Gauge, TrendingUp, Zap } from 'lucide-react';
import { HeartRateZonesChart } from '@/components/charts/heart-rate-zones-chart';
import { MileageTrendChart } from '@/components/charts/mileage-trend-chart';
import { ReadinessLoadChart } from '@/components/charts/readiness-load-chart';
import { SleepQualityChart } from '@/components/charts/sleep-quality-chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getHeartRateZoneBreakdown,
  getIntensityTrend,
  getMileageTrend,
  getReadinessTrend,
  getWorkoutSummary,
  getWorkouts,
} from '@/lib/garmin-data';

export default async function AnalyticsPage() {
  const [
    readinessTrend,
    mileageTrend,
    intensityTrend,
    heartZones,
    workouts,
    workoutSummary,
  ] = await Promise.all([
    getReadinessTrend(),
    getMileageTrend(),
    getIntensityTrend(),
    getHeartRateZoneBreakdown(),
    getWorkouts(),
    getWorkoutSummary(),
  ]);

  const latestReadiness = readinessTrend.at(-1);
  const earliestReadiness = readinessTrend[0];
  const acuteDelta =
    latestReadiness && earliestReadiness
      ? latestReadiness.acuteLoad - earliestReadiness.acuteLoad
      : 0;
  const readinessAverage =
    readinessTrend.length > 0
      ? readinessTrend.reduce((sum, entry) => sum + entry.readiness, 0) /
        readinessTrend.length
      : 0;

  const moderateAverage =
    intensityTrend.length > 0
      ? intensityTrend.reduce((sum, entry) => sum + entry.moderateMinutes, 0) /
        intensityTrend.length
      : 0;
  const vigorousAverage =
    intensityTrend.length > 0
      ? intensityTrend.reduce((sum, entry) => sum + entry.vigorousMinutes, 0) /
        intensityTrend.length
      : 0;

  const zone2 = heartZones.find(zone => zone.zone === 'Z2');
  const zone3 = heartZones.find(zone => zone.zone === 'Z3');
  const topSessions = [...workouts]
    .sort(
      (a, b) => (b.trainingLoad ?? 0) - (a.trainingLoad ?? 0),
    )
    .slice(0, 3);
  const topSession = topSessions[0];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="training">
        <TabsList className="w-full justify-start md:w-auto">
          <TabsTrigger value="training">Training Load</TabsTrigger>
          <TabsTrigger value="recovery">Recovery & Sleep</TabsTrigger>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Acute load delta"
              value={`${acuteDelta >= 0 ? '+' : ''}${acuteDelta.toFixed(0)}`}
              description="Change between first and latest 7-day training load."
              icon={<Gauge className="size-4" />}
            />
            <MetricCard
              title="Readiness average"
              value={readinessAverage.toFixed(0)}
              description="8-day rolling average readiness from Garmin."
              icon={<TrendingUp className="size-4" />}
            />
            <MetricCard
              title="Quality sessions"
              value={`${workoutSummary.qualitySessions}`}
              description="Load ≥ 130 in the last two weeks."
              icon={<Flame className="size-4" />}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <ReadinessLoadChart data={readinessTrend} className="h-full" />
            <MileageTrendChart data={mileageTrend} className="h-full" />
          </section>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>Coaching note</CardTitle>
              <CardDescription>
                Garmin load focus shows a slight endurance bias — sustain the volume
                but layer one additional high-aerobic session every 10 days.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Moderate minutes"
              value={`${moderateAverage.toFixed(0)} min`}
              description="Daily average moderate intensity minutes."
              icon={<Zap className="size-4" />}
            />
            <MetricCard
              title="Vigorous minutes"
              value={`${vigorousAverage.toFixed(0)} min`}
              description="Daily average vigorous minutes in activities."
              icon={<Flame className="size-4" />}
            />
            <MetricCard
              title="Zone 2 ratio"
              value={`${zone2?.percentage ?? 0}%`}
              description="Time spent in endurance HR zone (last 7 sessions)."
              icon={<Gauge className="size-4" />}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <SleepQualityChart data={intensityTrend} className="h-full" />
            <HeartRateZonesChart data={heartZones} className="h-full" />
          </section>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>Recovery insight</CardTitle>
              <CardDescription>
                Keep recovery in check—balance moderate and vigorous work to hold
                readiness steady.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Zone 3 usage ({zone3?.percentage ?? 0}%) is balanced with endurance
              work — maintain this split through the next build block.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Weekly distance"
              value={`${workoutSummary.weekDistance.toFixed(1)} km`}
              description="Total distance in the last seven days."
              icon={<Gauge className="size-4" />}
            />
            <MetricCard
              title="Average load"
              value={workoutSummary.averageLoad.toFixed(0)}
              description="Per-session training load."
              icon={<Flame className="size-4" />}
            />
            <MetricCard
              title="Top workout load"
              value={
                topSession && topSession.trainingLoad
                  ? `${topSession.trainingLoad}`
                  : '--'
              }
              description={
                topSession
                  ? `Highest recent load: ${topSession.title}`
                  : 'Highest recent load'
              }
              icon={<Flame className="size-4" />}
            />
          </section>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>Key sessions</CardTitle>
              <CardDescription>
                Highest-impact workouts and how they influenced readiness.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topSessions.map(session => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-border/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {session.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        • Load {session.trainingLoad}
                      </p>
                    </div>
                    <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                      {session.averagePace ?? 'pace n/a'} •{' '}
                      {session.averageHeartRate
                        ? `${session.averageHeartRate} bpm`
                        : 'HR n/a'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {session.notes ??
                      'Use this session as a benchmark for upcoming builds.'}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground">
          {icon}
        </span>
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
