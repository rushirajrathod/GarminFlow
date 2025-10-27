'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, Bot, Cog, Menu, Navigation } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type NavItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    description: 'Overview of readiness, mileage, and vitals.',
    href: '/',
    icon: Navigation,
  },
  {
    title: 'Workouts',
    description: 'Detailed log with splits, effort, and notes.',
    href: '/workouts',
    icon: Activity,
  },
  {
    title: 'AI Coach',
    description: 'Chat with GPT about your Garmin history.',
    href: '/chat',
    icon: Bot,
  },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const activeItem = useMemo(
    () => navItems.find(item => item.href === pathname),
    [pathname],
  );

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <aside
        className={cn(
          'relative hidden border-r border-border bg-sidebar transition-all duration-200 md:block',
          isCollapsed ? 'w-[84px]' : 'w-72',
        )}
      >
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
            <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary">
              <Navigation className="size-5" />
            </div>
            {!isCollapsed && (
              <div>
                <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                  Garmin Coach
                </p>
                <p className="text-xs text-muted-foreground">
                  Performance cockpit
                </p>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-8"
                  onClick={() => setIsCollapsed(prev => !prev)}
                >
                  <BarChart3 className="size-4" />
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              </TooltipContent>
            </Tooltip>
          </div>

          <nav className="mt-6 flex flex-col gap-2 px-4">
            {navItems.map(item => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
                        isCollapsed && 'justify-center px-0',
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {!isCollapsed && (
                        <div className="flex flex-col">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-xs text-muted-foreground/80">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">{item.title}</TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>

          {!isCollapsed && (
                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-sidebar-border bg-sidebar p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-sidebar-primary/10 text-sidebar-primary">
                  <Cog className="size-4" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-sidebar-foreground">
                    Weekly review
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Summaries land in your inbox every Monday.
                  </p>
                </div>
              </div>
              <Button className="mt-4 w-full" variant="outline">
                Coming soon
              </Button>
            </div>
          )}
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/0">
            <div className="flex flex-1 items-center gap-3 px-4 md:px-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="md:hidden" variant="outline" size="icon">
                    <Menu className="size-5" />
                    <span className="sr-only">Open navigation</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={12}>
                  {navItems.map(item => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href}>{item.title}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="hidden flex-col md:flex">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {activeItem?.title ?? 'Garmin Coach'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {activeItem?.description ??
                    'Your training data, visualized and explained.'}
                </span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                <Button variant="outline" size="sm" className="hidden md:flex">
                  Export data
                </Button>
                <div className="hidden items-center gap-2 rounded-xl border border-border px-3 py-1 text-xs font-medium md:flex">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Synced 2h ago
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-8 md:px-8 md:py-10">
            <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    );
}
