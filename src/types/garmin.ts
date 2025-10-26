export type WorkoutSplit = {
  segment: string;
  distanceKm: number;
  pace: string;
  heartRate: number;
  notes?: string;
};

export type Workout = {
  id: string;
  date: string;
  type: string;
  title: string;
  location?: string;
  distanceKm: number;
  durationMinutes: number;
  averagePace?: string;
  trainingLoad?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  perceivedEffort?: number;
  calories?: number;
  weather?: string;
  notes?: string;
  tags: string[];
  splits: WorkoutSplit[];
  moderateMinutes?: number;
  vigorousMinutes?: number;
  hasRoute?: boolean;
};

export type WeeklyMileage = {
  week: string;
  distanceKm: number;
  elevationGain: number;
  longRunKm: number;
  trainingLoad: number;
  readiness: number;
  activityCount: number;
};

export type ReadinessSnapshot = {
  date: string;
  readiness: number;
  hrv: number;
  restingHeartRate: number;
  sleepScore: number;
  acuteLoad: number;
  avgHeartRate: number;
};

export type IntensityRecord = {
  date: string;
  moderateMinutes: number;
  vigorousMinutes: number;
};

export type HeartRateZone = {
  zone: string;
  label: string;
  percentage: number;
};

export type TrainingFocus = {
  title: string;
  description: string;
  impact: 'positive' | 'neutral' | 'negative';
  delta: number;
};
