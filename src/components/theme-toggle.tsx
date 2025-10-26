'use client';

import { MoonStar, SunMedium } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      aria-label="Toggle theme"
      variant="outline"
      size="icon"
      className="relative h-9 w-9 overflow-hidden"
      onClick={toggleTheme}
    >
      <span className="sr-only">Toggle theme</span>
      <span
        aria-hidden
        className="grid h-full w-full place-items-center transition-all duration-200"
      >
        {theme === 'dark' ? (
          <MoonStar className="h-4 w-4" />
        ) : (
          <SunMedium className="h-5 w-5" />
        )}
      </span>
    </Button>
  );
}
