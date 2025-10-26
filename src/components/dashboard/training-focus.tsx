'use client';

import { ArrowDownRight, ArrowUpRight, Circle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainingFocus } from '@/types/garmin';
import { cn } from '@/lib/utils';

type TrainingFocusProps = {
  focus: TrainingFocus[];
};

export function TrainingFocusSummary({ focus }: TrainingFocusProps) {
  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle>Focus areas</CardTitle>
        <CardDescription>
          Themes derived from Garmin training readiness and load balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {focus.map(entry => (
          <article
            key={entry.title}
            className="flex items-start gap-3 rounded-2xl border border-border/60 p-4 transition-colors hover:border-border"
          >
            <ImpactIcon impact={entry.impact} />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">{entry.title}</h3>
              <p className="text-sm text-muted-foreground">{entry.description}</p>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

function ImpactIcon({ impact }: { impact: TrainingFocus['impact'] }) {
  const base = 'flex size-9 items-center justify-center rounded-full border border-border/70';

  if (impact === 'positive') {
    return (
      <div className={cn(base, 'text-emerald-500')}>
        <ArrowUpRight className="size-4" />
      </div>
    );
  }

  if (impact === 'negative') {
    return (
      <div className={cn(base, 'text-rose-500')}>
        <ArrowDownRight className="size-4" />
      </div>
    );
  }

  return (
    <div className={cn(base, 'text-muted-foreground')}>
      <Circle className="size-3" />
    </div>
  );
}
