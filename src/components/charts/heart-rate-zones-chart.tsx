'use client';

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from 'recharts';
import { HeartRateZone } from '@/types/garmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type HeartRateZonesChartProps = {
  data: HeartRateZone[];
  className?: string;
};

const COLORS = ['dodgerblue', 'mediumseagreen', 'goldenrod', 'tomato', 'mediumpurple'];

export function HeartRateZonesChart({ data, className }: HeartRateZonesChartProps) {
  return (
    <Card className={cn('h-[360px]', className)}>
      <CardHeader className="pb-4">
        <CardTitle>Heart-rate distribution</CardTitle>
        <CardDescription>
          Time-in-zone captured across the last seven activities.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex h-full flex-col">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="percentage"
                nameKey="label"
                innerRadius="45%"
                outerRadius="70%"
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.zone} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ZoneTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.map((zone, index) => (
            <div
              key={zone.zone}
              className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2"
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {zone.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {zone.percentage}% of training time
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ZoneTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  const entry = payload[0];

  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
      <p className="text-sm font-semibold text-foreground">{entry.name}</p>
      <p className="text-xs text-muted-foreground">
        {typeof entry.value === 'number' ? `${entry.value.toFixed(1)}% in zone` : '--'}
      </p>
    </div>
  );
}
