import { NextResponse } from 'next/server';
import { getActivityCoordinates } from '@/lib/garmin-data';

type RouteParams = {
  params: Promise<{
    id: string;
  } | undefined>;
};

export async function GET(_request: Request, context: RouteParams) {
  const params = (await context.params) ?? {};
  const { id } = params as { id?: string };

  if (!id) {
    return NextResponse.json(
      { error: 'Activity ID is required' },
      { status: 400 },
    );
  }

  const coordinates = await getActivityCoordinates(id);

  return NextResponse.json({ coordinates });
}
