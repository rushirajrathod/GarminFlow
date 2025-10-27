'use client';

import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts/types/component/DefaultTooltipContent';
import { ReadinessSnapshot } from '@/types/garmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ReadinessLoadChartProps = {
  data: ReadinessSnapshot[];
  className?: string;
};

export function ReadinessLoadChart({ data, className }: ReadinessLoadChartProps) {
  const formatted = data.map(entry => ({
    ...entry,
    label: new Date(entry.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <Card className={cn('h-[360px]', className)}>
      <CardHeader className="pb-4">
        <CardTitle>Heart rate vs. load</CardTitle>
        <CardDescription>
          Daily average activity heart-rate compared with Garmin training load.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formatted} margin={{ top: 12, right: 16, bottom: 12, left: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 6" />
            <XAxis
              dataKey="label"
              stroke="dimgray"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              yAxisId="load"
              orientation="right"
              stroke="dimgray"
              axisLine={false}
              tickLine={false}
              fontSize={12}
            />
            <YAxis
              yAxisId="heartRate"
              orientation="left"
              stroke="dimgray"
              axisLine={false}
              tickLine={false}
              fontSize={12}
              domain={[50, 190]}
            />
            <Tooltip content={<ReadinessTooltip />} />
            <Legend iconType="circle" />
            <Area
              yAxisId="load"
              type="monotone"
              dataKey="acuteLoad"
              name="Training load"
              fill="lightblue"
              fillOpacity={0.3}
              stroke="royalblue"
              strokeWidth={2}
            />
            <Line
              yAxisId="heartRate"
              type="monotone"
              dataKey="avgHeartRate"
              name="Average HR"
              stroke="crimson"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ReadinessTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  const heartRate = payload.find(item => item.dataKey === 'avgHeartRate');
  const load = payload.find(item => item.dataKey === 'acuteLoad');

  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-foreground">
          Avg HR {typeof heartRate?.value === 'number' ? heartRate.value.toFixed(0) : '--'} bpm
        </p>
        <p className="text-muted-foreground">
          Acute load {typeof load?.value === 'number' ? load.value.toFixed(0) : '--'}
        </p>
      </div>
    </div>
  );
}
