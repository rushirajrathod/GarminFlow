import React from 'react';
import { HeartRateZonesChart } from '@/components/charts/heart-rate-zones-chart';
import { MileageTrendChart } from '@/components/charts/mileage-trend-chart';
import { ReadinessLoadChart } from '@/components/charts/readiness-load-chart';
import { SleepQualityChart } from '@/components/charts/sleep-quality-chart';
import { Flame, Gauge, Zap } from 'lucide-react';
import { KeyMetrics } from '@/components/dashboard/key-metrics';
import { RecentWorkouts } from '@/components/dashboard/recent-workouts';
import { TrainingFocusSummary } from '@/components/dashboard/training-focus';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getHeartRateZoneBreakdown,
  getKeyMetrics,
  getMileageTrend,
  getReadinessTrend,
  getRecentWorkouts,
  getIntensityTrend,
  getTrainingFocus,
} from '@/lib/garmin-data';

export default async function DashboardPage() {
  const [
    metrics,
    mileageTrend,
    readinessTrend,
    intensityTrend,
    heartZones,
    recentWorkouts,
    focusAreas,
  ] = await Promise.all([
    getKeyMetrics(),
    getMileageTrend(),
    getReadinessTrend(),
    getIntensityTrend(),
    getHeartRateZoneBreakdown(),
    getRecentWorkouts(4),
    getTrainingFocus(),
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
  const zone2 = heartZones.find(zone => zone.zone === 'Z2');

  return (
    <div className="space-y-6">
      <KeyMetrics metrics={metrics} />

      <section className="grid gap-4 md:grid-cols-3">
        <HighlightCard
          icon={<Gauge className="size-4" />}
          title="Acute load delta"
          value={`${acuteDelta >= 0 ? '+' : ''}${acuteDelta.toFixed(0)}`}
          description="Change in 7-day load from oldest to latest readiness entry."
        />
        <HighlightCard
          icon={<Flame className="size-4" />}
          title="Readiness average"
          value={`${readinessAverage.toFixed(0)}`}
          description="Eight-day rolling average readiness from Garmin."
        />
        <HighlightCard
          icon={<Zap className="size-4" />}
          title="Zone 2 ratio"
          value={`${zone2?.percentage ?? 0}%`}
          description="Time-in-zone across the last seven activities."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <MileageTrendChart data={mileageTrend} />
        <ReadinessLoadChart data={readinessTrend} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SleepQualityChart data={intensityTrend} className="h-full" />
        <HeartRateZonesChart data={heartZones} className="h-full" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <RecentWorkouts workouts={recentWorkouts} />
        <TrainingFocusSummary focus={focusAreas} />
      </section>
    </div>
  );
}

function HighlightCard({
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
