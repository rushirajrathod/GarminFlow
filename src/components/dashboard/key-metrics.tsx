'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyMetric } from '@/lib/garmin-data';
import { cn } from '@/lib/utils';

type KeyMetricsProps = {
  metrics: KeyMetric[];
};

export function KeyMetrics({ metrics }: KeyMetricsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map(metric => (
        <Card key={metric.id} className="border-border/80">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.label}
            </CardTitle>
            <CardDescription>{metric.helper}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold tracking-tight">
              {metric.value}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <TrendIcon trend={metric.trend} />
              <span
                className={cn(
                  'font-medium',
                  metric.trend === 'up' && 'text-emerald-500',
                  metric.trend === 'down' && 'text-rose-500',
                )}
              >
                {metric.delta}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function TrendIcon({ trend }: { trend: KeyMetric['trend'] }) {
  const className = 'size-4 rounded-full border border-border/70 p-1';

  if (trend === 'up') {
    return (
      <span className={cn(className, 'text-emerald-500')}>
        <ArrowUpRight className="size-3" />
      </span>
    );
  }

  if (trend === 'down') {
    return (
      <span className={cn(className, 'text-rose-500')}>
        <ArrowDownRight className="size-3" />
      </span>
    );
  }

  return (
    <span className={cn(className, 'text-muted-foreground')}>
      <Minus className="size-3" />
    </span>
  );
}
