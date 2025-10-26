'use client';

import { Calendar, MapPin, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RacePlan } from '@/lib/garmin-data';

export function RacePlanCard({ race }: { race: RacePlan }) {
  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle>Next target</CardTitle>
        <CardDescription>
          Key race phases and focus areas leading into your goal event.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm text-muted-foreground">
          <InfoLine icon={<Target className="size-3.5" />} label="Event">
            {race.name}
          </InfoLine>
          <InfoLine icon={<Calendar className="size-3.5" />} label="Date">
            {new Date(race.date).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </InfoLine>
          <InfoLine icon={<MapPin className="size-3.5" />} label="Location">
            {race.location}
          </InfoLine>
          <InfoLine icon={<Target className="size-3.5" />} label="Target time">
            {race.targetTime}
          </InfoLine>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Macro blocks
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {race.focusBlocks.map(block => (
              <div
                key={block.label}
                className="rounded-xl border border-border/70 p-3"
              >
                <p className="text-sm font-semibold text-foreground">
                  {block.label}
                </p>
                <p className="text-xs text-muted-foreground">
            {block.weeks} weeks • {block.emphasis}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoLine({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground">
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{children}</span>
      </div>
    </div>
  );
}
