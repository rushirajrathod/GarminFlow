import fs from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  HeartRateZone,
  IntensityRecord,
  ReadinessSnapshot,
  TrainingFocus,
  WeeklyMileage,
  Workout,
} from '@/types/garmin';

export type KeyMetric = {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat';
  helper: string;
};

type ActivityFile = {
  id: string;
  name: string;
  type: string;
  distanceKm: number;
  durationMinutes: number;
  trainingLoad: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;
  moderateMinutes: number;
  vigorousMinutes: number;
  startTime: Date;
  hrZones: number[];
  fitFile: string;
  hasPolyline: boolean;
};

const DATA_ROOT =
  process.env.GARMIN_DATA_ROOT ??
  path.resolve(process.cwd(), 'HealthData');
const ACTIVITIES_DIR = path.join(DATA_ROOT, 'FitFiles', 'Activities');

type FitRecord = {
  type?: string;
  data?: {
    position_lat?: number;
    position_long?: number;
    [key: string]: unknown;
  };
};

type ParsedFit = {
  records?: FitRecord[];
};

type FitDecoderModule = {
  fit2json: (arrayBuffer: ArrayBuffer) => unknown;
  parseRecords: (
    json: unknown,
    options?: { skipUnknown?: boolean },
  ) => ParsedFit;
};

let fitDecoderLoader: Promise<FitDecoderModule> | null = null;

async function getFitDecoder() {
  if (!fitDecoderLoader) {
    fitDecoderLoader = import('fit-decoder').then(
      mod => (mod.default ?? mod) as FitDecoderModule,
    );
  }

  return fitDecoderLoader;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const sum = (values: number[]) =>
  values.reduce((total, value) => total + (value || 0), 0);

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const startOfWeek = (date: Date) => {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7; // make Monday start
  copy.setDate(copy.getDate() - diff);
  return copy;
};

const toISODate = (date: Date) => startOfDay(date).toISOString().slice(0, 10);

const round = (value: number, digits = 1) =>
  Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;

const safePace = (distanceKm: number, durationMinutes: number) => {
  if (!distanceKm || distanceKm === 0) return undefined;
  const pace = durationMinutes / distanceKm; // minutes per km
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
};

const loadActivities = cache(async (): Promise<ActivityFile[]> => {
  try {
    const entries = await fs.readdir(ACTIVITIES_DIR);
    const activityFiles = entries.filter(file =>
      /^activity_\d+\.json$/i.test(file),
    );

    const activities = await Promise.all(
      activityFiles.map(async file => {
        const activityPath = path.join(ACTIVITIES_DIR, file);
        const raw = await fs.readFile(activityPath, 'utf8');
        const json = JSON.parse(raw) ?? {};

        const startTime =
          typeof json.beginTimestamp === 'number'
            ? new Date(json.beginTimestamp)
            : json.startTimeLocal
              ? new Date(
                  `${String(json.startTimeLocal).replace(' ', 'T')}`,
                )
              : new Date();

        const distanceKm =
          typeof json.distance === 'number' ? json.distance / 1000 : 0;
        const durationMinutes =
          typeof json.duration === 'number' ? json.duration / 60 : 0;

        const activityId = String(json.activityId ?? file.replace(/\D+/g, ''));
        const fitFile = path.join(
          DATA_ROOT,
          'FitFiles',
          'Activities',
          `${activityId}_ACTIVITY.fit`,
        );

        let hasPolyline = false;
        try {
          const detailRaw = await fs.readFile(
            path.join(ACTIVITIES_DIR, `activity_details_${activityId}.json`),
            'utf8',
          );
          const detail = JSON.parse(detailRaw);
          hasPolyline = Boolean(detail?.metadataDTO?.hasPolyline);
        } catch (error) {
          if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
            console.warn('[garmin-data] Unable to read activity detail', activityId, error);
          }
        }

        return {
          id: activityId,
          name:
            json.activityName ??
            json.activityType?.typeKey?.replace('_', ' ') ??
            'Activity',
          type: json.activityType?.typeKey ?? 'unknown',
          distanceKm,
          durationMinutes,
          trainingLoad: json.activityTrainingLoad ?? 0,
          averageHeartRate:
            typeof json.averageHR === 'number' ? json.averageHR : undefined,
          maxHeartRate:
            typeof json.maxHR === 'number' ? json.maxHR : undefined,
          calories: typeof json.calories === 'number' ? json.calories : 0,
          moderateMinutes: json.moderateIntensityMinutes ?? 0,
          vigorousMinutes: json.vigorousIntensityMinutes ?? 0,
          startTime,
          hrZones: [
            json.hrTimeInZone_1 ?? 0,
            json.hrTimeInZone_2 ?? 0,
            json.hrTimeInZone_3 ?? 0,
            json.hrTimeInZone_4 ?? 0,
            json.hrTimeInZone_5 ?? 0,
          ],
          fitFile,
          hasPolyline,
        };
      }),
    );

    return activities
      .filter(activity => !Number.isNaN(activity.startTime.getTime()))
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  } catch (error) {
    console.warn(
      '[garmin-data] Unable to load activities from',
      ACTIVITIES_DIR,
      error,
    );
    return [];
  }
});

const loadMonitoringSteps = cache(async () => {
  try {
    const rows = await prisma.$queryRaw<
      { day: string; steps: number | null }[]
    >(Prisma.sql`
      SELECT
        date(timestamp) AS day,
        SUM(COALESCE(steps, 0)) AS steps
      FROM monitoring
      GROUP BY day
      ORDER BY day DESC
      LIMIT 30
    `);
    return rows ?? [];
  } catch (error) {
    console.warn('[garmin-data] Unable to query monitoring steps', error);
    return [];
  }
});

function trendDelta(current: number, previous: number) {
  const delta = current - previous;
  const trend: KeyMetric['trend'] =
    delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';
  const prefix = delta >= 0 ? '+' : '';
  return { delta: `${prefix}${round(delta, 1)}`, trend };
}

export const getKeyMetrics = cache(async (): Promise<KeyMetric[]> => {
  const activities = await loadActivities();
  if (activities.length === 0) {
    return [
      {
        id: 'no-data',
        label: 'No Garmin data found',
        value: '--',
        delta: 'Import data via GarminDB',
        trend: 'flat',
        helper:
          'Run garmindb_cli.py --all --download --import --analyze, then refresh.',
      },
    ];
  }

  const monitoringSteps = await loadMonitoringSteps();

  const now = new Date();
  const sevenDaysAgo = startOfDay(new Date(now));
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const fourteenDaysAgo = startOfDay(new Date(now));
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);

  const inRange = (activity: ActivityFile, from: Date, to: Date) => {
    const ts = activity.startTime.getTime();
    return ts >= from.getTime() && ts <= to.getTime();
  };

  const currentRange = activities.filter(activity =>
    inRange(activity, sevenDaysAgo, now),
  );
  const previousRange = activities.filter(activity =>
    inRange(activity, fourteenDaysAgo, new Date(sevenDaysAgo.getTime() - 1)),
  );

  const distanceCurrent = sum(currentRange.map(a => a.distanceKm));
  const distancePrevious = sum(previousRange.map(a => a.distanceKm));
  const longest = currentRange.length
    ? Math.max(...currentRange.map(a => a.distanceKm))
    : 0;
  const { delta: distanceDelta, trend: distanceTrend } = trendDelta(
    distanceCurrent,
    distancePrevious,
  );

  const loadCurrent = sum(currentRange.map(a => a.trainingLoad));
  const loadPrevious = sum(previousRange.map(a => a.trainingLoad));
  const { delta: loadDelta, trend: loadTrend } = trendDelta(
    loadCurrent,
    loadPrevious,
  );

  const intensityCurrent = sum(
    currentRange.map(a => a.moderateMinutes + a.vigorousMinutes),
  );
  const intensityPrevious = sum(
    previousRange.map(a => a.moderateMinutes + a.vigorousMinutes),
  );
  const { delta: intensityDelta, trend: intensityTrend } = trendDelta(
    intensityCurrent,
    intensityPrevious,
  );

  const avgHrCurrent =
    currentRange.length > 0
      ? sum(currentRange.map(a => a.averageHeartRate ?? 0)) /
        currentRange.filter(a => a.averageHeartRate).length
      : 0;
  const avgHrPrevious =
    previousRange.length > 0
      ? sum(previousRange.map(a => a.averageHeartRate ?? 0)) /
        previousRange.filter(a => a.averageHeartRate).length
      : 0;
  const { delta: hrDelta, trend: hrTrend } = trendDelta(
    avgHrCurrent || 0,
    avgHrPrevious || 0,
  );

  const stepsCurrent = monitoringSteps
    .filter(row => {
      const day = startOfDay(new Date(row.day));
      return day >= sevenDaysAgo && day <= now;
    })
    .reduce((acc, row) => acc + (row.steps ?? 0), 0);
  const stepsPrevious = monitoringSteps
    .filter(row => {
      const day = startOfDay(new Date(row.day));
      return day >= fourteenDaysAgo && day < sevenDaysAgo;
    })
    .reduce((acc, row) => acc + (row.steps ?? 0), 0);
  const { delta: stepsDelta, trend: stepsTrend } = trendDelta(
    stepsCurrent,
    stepsPrevious,
  );

  return [
    {
      id: 'weekly-distance',
      label: '7-day distance',
      value: `${round(distanceCurrent)} km`,
      delta: `${distanceDelta} km vs prev`,
      trend: distanceTrend,
      helper: `Longest session ${round(longest)} km`,
    },
    {
      id: 'steps',
      label: '7-day steps',
      value: stepsCurrent ? `${Math.round(stepsCurrent)}` : '—',
      delta: `${stepsDelta} vs prev`,
      trend: stepsTrend,
      helper: 'Steps captured by Garmin daily monitoring (if available).',
    },
    {
      id: 'training-load',
      label: 'Training load',
      value: loadCurrent ? `${Math.round(loadCurrent)}` : '—',
      delta: `${loadDelta} vs prev`,
      trend: loadTrend,
      helper: 'Sum of activity training load for the last 7 days.',
    },
    {
      id: 'intensity',
      label: 'Intensity minutes',
      value: `${Math.round(intensityCurrent)} min`,
      delta: `${intensityDelta} min vs prev`,
      trend: intensityTrend,
      helper: 'Moderate + vigorous minutes recorded by Garmin activities.',
    },
    {
      id: 'avg-hr',
      label: 'Avg activity HR',
      value: avgHrCurrent ? `${Math.round(avgHrCurrent)} bpm` : '—',
      delta: `${hrDelta} bpm vs prev`,
      trend: hrTrend,
      helper: 'Average activity heart-rate (Garmin summary files).',
    },
  ];
});

export const getMileageTrend = cache(async (): Promise<WeeklyMileage[]> => {
  const activities = await loadActivities();
  if (activities.length === 0) return [];

  const grouped = new Map<
    string,
    {
      distance: number;
      trainingLoad: number;
      longRun: number;
      count: number;
    }
  >();

  activities.forEach(activity => {
    const key = toISODate(startOfWeek(activity.startTime));
    const bucket = grouped.get(key) ?? {
      distance: 0,
      trainingLoad: 0,
      longRun: 0,
      count: 0,
    };
    bucket.distance += activity.distanceKm;
    bucket.trainingLoad += activity.trainingLoad;
    bucket.longRun = Math.max(bucket.longRun, activity.distanceKm);
    bucket.count += 1;
    grouped.set(key, bucket);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, bucket]) => {
      const readiness = clamp(
        Math.round(70 + bucket.longRun * 2 - bucket.trainingLoad * 0.1),
        40,
        95,
      );

      return {
        week,
        distanceKm: round(bucket.distance, 1),
        elevationGain: 0,
        longRunKm: round(bucket.longRun, 1),
        trainingLoad: Math.round(bucket.trainingLoad),
        readiness,
        activityCount: bucket.count,
      };
    });
});

export const getReadinessTrend = cache(
  async (): Promise<ReadinessSnapshot[]> => {
    const activities = await loadActivities();
    if (activities.length === 0) return [];

    const byDay = new Map<
      string,
      {
        heartRates: number[];
        maxHeartRates: number[];
        trainingLoad: number;
        intensityMinutes: number;
      }
    >();

    activities.forEach(activity => {
      const key = toISODate(activity.startTime);
      const bucket = byDay.get(key) ?? {
        heartRates: [],
        maxHeartRates: [],
        trainingLoad: 0,
        intensityMinutes: 0,
      };
      if (activity.averageHeartRate) {
        bucket.heartRates.push(activity.averageHeartRate);
      }
      if (activity.maxHeartRate) {
        bucket.maxHeartRates.push(activity.maxHeartRate);
      }
      bucket.trainingLoad += activity.trainingLoad;
      bucket.intensityMinutes +=
        activity.moderateMinutes + activity.vigorousMinutes;
      byDay.set(key, bucket);
    });

    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, bucket]) => {
        const avgHeartRate =
          bucket.heartRates.length > 0
            ? sum(bucket.heartRates) / bucket.heartRates.length
            : 0;
        const maxHeartRate =
          bucket.maxHeartRates.length > 0
            ? Math.max(...bucket.maxHeartRates)
            : avgHeartRate;
        const readiness = clamp(
          Math.round(110 - avgHeartRate),
          40,
          95,
        );
        const restingHeartRate = clamp(Math.round(avgHeartRate - 15), 35, 80);
        const hrv = clamp(Math.round(maxHeartRate - avgHeartRate), 10, 60);
        const sleepScore = clamp(
          Math.round(90 - bucket.intensityMinutes / 5),
          50,
          95,
        );

        return {
          date,
          readiness,
          hrv,
          restingHeartRate,
          sleepScore,
          acuteLoad: Math.round(bucket.trainingLoad || bucket.intensityMinutes),
          avgHeartRate: Math.round(avgHeartRate),
        };
      });
  },
);

export const getIntensityTrend = cache(
  async (): Promise<IntensityRecord[]> => {
    const activities = await loadActivities();
    if (activities.length === 0) return [];

    const byDay = new Map<
      string,
      { moderate: number; vigorous: number }
    >();

    activities.forEach(activity => {
      const key = toISODate(activity.startTime);
      const bucket = byDay.get(key) ?? { moderate: 0, vigorous: 0 };
      bucket.moderate += activity.moderateMinutes;
      bucket.vigorous += activity.vigorousMinutes;
      byDay.set(key, bucket);
    });

    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, bucket]) => ({
        date,
        moderateMinutes: Math.round(bucket.moderate),
        vigorousMinutes: Math.round(bucket.vigorous),
      }));
  },
);

export const getHeartRateZoneBreakdown = cache(
  async (): Promise<HeartRateZone[]> => {
    const activities = await loadActivities();
    if (activities.length === 0) return [];

    const totals = [0, 0, 0, 0, 0];
    activities.forEach(activity => {
      activity.hrZones.forEach((seconds, index) => {
        totals[index] += seconds;
      });
    });

    const totalSeconds = sum(totals);
    if (!totalSeconds) return [];

    const labels = ['Recovery', 'Endurance', 'Tempo', 'Threshold', 'VO₂ Max'];

    return totals.map((seconds, index) => ({
      zone: `Z${index + 1}`,
      label: labels[index],
      percentage: round((seconds / totalSeconds) * 100, 1),
    }));
  },
);

export const getTrainingFocus = cache(
  async (): Promise<TrainingFocus[]> => {
    const zones = await getHeartRateZoneBreakdown();
    if (zones.length === 0) {
      return [
        {
          title: 'No Garmin data yet',
          description:
            'Import activities with GarminDB and refresh to unlock coaching insights.',
          impact: 'neutral',
          delta: 0,
        },
      ];
    }

    const endurance = zones.find(zone => zone.zone === 'Z2')?.percentage ?? 0;
    const tempo = zones.find(zone => zone.zone === 'Z3')?.percentage ?? 0;
    const threshold = zones.find(zone => zone.zone === 'Z4')?.percentage ?? 0;

    return [
      {
        title: 'Endurance base',
        description: `You spent ${round(
          endurance,
        )}% of recent training in Z2. Keep steady aerobic sessions to maintain resilience.`,
        impact: endurance > 35 ? 'positive' : 'neutral',
        delta: Math.round(endurance - 30),
      },
      {
        title: 'Tempo conditioning',
        description: `Tempo/threshold accounted for ${round(
          tempo + threshold,
        )}% of time. Add one focused quality workout if you need more race specificity.`,
        impact: tempo + threshold > 20 ? 'positive' : 'neutral',
        delta: Math.round(tempo + threshold),
      },
      {
        title: 'High-intensity balance',
        description:
          'Keep VO₂ max efforts targeted—brief doses keep the engine sharp without overstressing recovery.',
        impact: threshold > 15 ? 'neutral' : 'positive',
        delta: Math.round(threshold),
      },
    ];
  },
);

const mapActivityToWorkout = (activity: ActivityFile): Workout => ({
  id: activity.id,
  date: activity.startTime.toISOString(),
  type: activity.type.replace('_', ' '),
  title: activity.name,
  distanceKm: round(activity.distanceKm, 2),
  durationMinutes: round(activity.durationMinutes, 1),
  averagePace: safePace(activity.distanceKm, activity.durationMinutes),
  trainingLoad: Math.round(activity.trainingLoad),
  averageHeartRate: activity.averageHeartRate
    ? Math.round(activity.averageHeartRate)
    : undefined,
  maxHeartRate: activity.maxHeartRate
    ? Math.round(activity.maxHeartRate)
    : undefined,
  calories: activity.calories ? Math.round(activity.calories) : undefined,
  tags: [activity.type.replace('_', ' ')],
  splits: [],
  moderateMinutes: activity.moderateMinutes,
  vigorousMinutes: activity.vigorousMinutes,
  hasRoute: activity.hasPolyline,
});

export const getRecentWorkouts = cache(
  async (limit = 5): Promise<Workout[]> => {
    const activities = await loadActivities();
    return activities.slice(0, limit).map(mapActivityToWorkout);
  },
);

export const getWorkouts = cache(async (): Promise<Workout[]> => {
  const activities = await loadActivities();
  return activities.map(mapActivityToWorkout);
});

type RoutePoint = [number, number, number];

const coordinatesCache = new Map<string, RoutePoint[]>();

export async function getActivityCoordinates(
  activityId: string,
): Promise<RoutePoint[]> {
  if (!activityId) {
    return [];
  }

  if (coordinatesCache.has(activityId)) {
    return coordinatesCache.get(activityId) ?? [];
  }

  const fitPath = path.join(
    DATA_ROOT,
    'FitFiles',
    'Activities',
    `${activityId}_ACTIVITY.fit`,
  );

  try {
    const file = await fs.readFile(fitPath);
    const arrayBuffer = file.buffer.slice(
      file.byteOffset ?? 0,
      file.byteOffset + file.byteLength,
    );

    const fitDecoder = await getFitDecoder();

    const raw = fitDecoder.fit2json(arrayBuffer);
    const parsed = fitDecoder.parseRecords(raw, { skipUnknown: true });
    const records = Array.isArray(parsed.records) ? parsed.records : [];

    const coordinates: RoutePoint[] = [];
    for (const record of records) {
      if (record?.type !== 'record') continue;
      const data = record.data;
      const positionLat =
        typeof data?.position_lat === 'number' ? data.position_lat : undefined;
      const positionLong =
        typeof data?.position_long === 'number'
          ? data.position_long
          : undefined;
      const altitude =
        typeof data?.altitude === 'number' ? data.altitude : undefined;

      if (
        typeof positionLat === 'number' &&
        typeof positionLong === 'number' &&
        Number.isFinite(positionLat) &&
        Number.isFinite(positionLong)
      ) {
        coordinates.push([positionLat, positionLong, altitude ?? 0]);
      }
    }

    if (coordinates.length === 0) {
      coordinatesCache.set(activityId, []);
      return [];
    }

    const stride = Math.max(1, Math.floor(coordinates.length / 750));
    const simplified: RoutePoint[] = coordinates.filter(
      (_, index) => index % stride === 0,
    );
    const last = coordinates[coordinates.length - 1];
    const lastSimplified = simplified[simplified.length - 1];
    if (
      last &&
      (!lastSimplified || lastSimplified[0] !== last[0] || lastSimplified[1] !== last[1])
    ) {
      simplified.push(last);
    }

    coordinatesCache.set(activityId, simplified);
    return simplified;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn('[garmin-data] Failed to load route for activity', activityId, error);
    }
    coordinatesCache.set(activityId, []);
    return [];
  }
}

export const getWorkoutSummary = cache(async () => {
  const activities = await loadActivities();
  if (activities.length === 0) {
    return {
      totalDistance: 0,
      totalDuration: 0,
      averageLoad: 0,
      weekDistance: 0,
      qualitySessions: 0,
      longestSession: undefined,
    };
  }

  const totalDistance = sum(activities.map(a => a.distanceKm));
  const totalDuration = sum(activities.map(a => a.durationMinutes));
  const averageLoad =
    activities.length > 0
      ? sum(activities.map(a => a.trainingLoad)) / activities.length
      : 0;

  const now = new Date();
  const sevenDaysAgo = startOfDay(new Date(now));
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const weekly = activities.filter(
    activity => activity.startTime >= sevenDaysAgo,
  );
  const weekDistance = sum(weekly.map(a => a.distanceKm));

  const qualitySessions = activities.filter(
    activity => activity.trainingLoad >= 130,
  ).length;

  const longestSession = activities.reduce<ActivityFile | undefined>(
    (longest, activity) =>
      !longest || activity.distanceKm > longest.distanceKm
        ? activity
        : longest,
    undefined,
  );

  return {
    totalDistance: round(totalDistance, 1),
    totalDuration: round(totalDuration, 1),
    averageLoad: round(averageLoad, 1),
    weekDistance: round(weekDistance, 1),
    qualitySessions,
    longestSession: longestSession
      ? mapActivityToWorkout(longestSession)
      : undefined,
  };
});

export const getNextRacePlan = cache(async () => {
  const activities = await loadActivities();
  if (activities.length === 0) {
    return {
      name: 'No activities yet',
      date: '',
      location: 'GarminDB',
      targetTime: '--',
      focusBlocks: [],
    };
  }

  const latest = activities[0];
  const durationMinutes = latest.durationMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = Math.round(durationMinutes % 60)
    .toString()
    .padStart(2, '0');

  return {
    name: `${latest.name} (${latest.type.replace('_', ' ')})`,
    date: latest.startTime.toISOString(),
    location: 'Garmin activity history',
    targetTime: `${hours}:${minutes}:00`,
    focusBlocks: [
      {
        label: 'Review',
        weeks: 1,
        emphasis: 'Analyse recent training load to set your next target.',
      },
      {
        label: 'Build',
        weeks: 3,
        emphasis:
          'Blend endurance and tempo sessions to maintain fitness momentum.',
      },
      {
        label: 'Sharpen',
        weeks: 2,
        emphasis: 'Add focused race-pace efforts leading into your goal event.',
      },
    ],
  };
});
