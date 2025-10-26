'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import { WeeklyMileage } from '@/types/garmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type MileageTrendChartProps = {
  data: WeeklyMileage[];
  className?: string;
};

export function MileageTrendChart({ data, className }: MileageTrendChartProps) {
  const formatted = data.map(entry => ({
    ...entry,
    label: new Date(entry.week).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <Card className={cn('h-[360px]', className)}>
      <CardHeader className="pb-4">
        <CardTitle>Weekly mileage trend</CardTitle>
        <CardDescription>
          Distance and training load over the last eight weeks.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 8" />
            <XAxis
              dataKey="label"
              stroke="dimgray"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              yAxisId="distance"
              stroke="dimgray"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              yAxisId="load"
              orientation="right"
              stroke="dimgray"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <Tooltip content={<DistanceTooltip />} />
            <Legend iconType="circle" />
            <Line
              type="monotone"
              dataKey="distanceKm"
              name="Distance (km)"
              yAxisId="distance"
              stroke="mediumseagreen"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="trainingLoad"
              name="Training load"
              yAxisId="load"
              stroke="darkorange"
              strokeWidth={2}
              dot={false}
              strokeDasharray="6 4"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function DistanceTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  const distance = payload.find(item => item.dataKey === 'distanceKm');
  const load = payload.find(item => item.dataKey === 'trainingLoad');

  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {typeof distance?.value === 'number'
          ? `${distance.value.toFixed(1)} km`
          : '--'}
      </p>
      <p className="text-xs text-muted-foreground">
        Training load{' '}
        {typeof load?.value === 'number' ? load.value.toFixed(0) : '--'}
      </p>
    </div>
  );
}
