import { HeartRateZonesChart } from '@/components/charts/heart-rate-zones-chart';
import { MileageTrendChart } from '@/components/charts/mileage-trend-chart';
import { ReadinessLoadChart } from '@/components/charts/readiness-load-chart';
import { SleepQualityChart } from '@/components/charts/sleep-quality-chart';
import { KeyMetrics } from '@/components/dashboard/key-metrics';
import { RacePlanCard } from '@/components/dashboard/race-plan-card';
import { RecentWorkouts } from '@/components/dashboard/recent-workouts';
import { TrainingFocusSummary } from '@/components/dashboard/training-focus';
import {
  getHeartRateZoneBreakdown,
  getKeyMetrics,
  getMileageTrend,
  getNextRacePlan,
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
    racePlan,
  ] = await Promise.all([
    getKeyMetrics(),
    getMileageTrend(),
    getReadinessTrend(),
    getIntensityTrend(),
    getHeartRateZoneBreakdown(),
    getRecentWorkouts(4),
    getTrainingFocus(),
    getNextRacePlan(),
  ]);

  return (
    <div className="space-y-6">
      <KeyMetrics metrics={metrics} />

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

      <RacePlanCard race={racePlan} />
    </div>
  );
}
