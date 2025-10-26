import { NextResponse } from 'next/server';
import {
  getKeyMetrics,
  getNextRacePlan,
  getRecentWorkouts,
  getTrainingFocus,
} from '@/lib/garmin-data';

const SYSTEM_PROMPT = `You are Garmin Coach AI, an expert endurance coach who personalises guidance using Garmin Connect metrics. Use the provided context only. Where useful, tie insights to readiness, training load, time-in-zone, and sleep.`;

type ChatRequestBody = {
  message?: string;
};

export async function POST(request: Request) {
  let payload: ChatRequestBody;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const userMessage = payload.message?.trim();

  if (!userMessage) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  const context = buildContextSummary();

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      reply: fallbackReply(context, userMessage),
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `${context}\n\nQuestion: ${userMessage.slice(0, 4000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chat] OpenAI error', errorText);
      return NextResponse.json(
        {
          reply: fallbackReply(context, userMessage),
        },
        { status: 200 },
      );
    }

    const data = await response.json();
    const reply: string | undefined = data.choices?.[0]?.message?.content;

    return NextResponse.json({
      reply: reply ?? fallbackReply(context, userMessage),
    });
  } catch (error) {
    console.error('[chat] request failed', error);
    return NextResponse.json({
      reply: fallbackReply(context, userMessage),
    });
  }
}

function buildContextSummary() {
  const metrics = getKeyMetrics();
  const workouts = getRecentWorkouts(3);
  const focus = getTrainingFocus();
  const race = getNextRacePlan();

  const metricsText = metrics
    .map(
      metric => `- ${metric.label}: ${metric.value} (${metric.delta})`,
    )
    .join('\n');

  const workoutText = workouts
    .map(workout => {
      const date = new Date(workout.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      return `- ${date} · ${workout.title} (${workout.distanceKm.toFixed(1)} km, load ${workout.trainingLoad})`;
    })
    .join('\n');

  const focusText = focus
    .map(entry => `- ${entry.title}: ${entry.description}`)
    .join('\n');

  return `Garmin data context\nKey metrics:\n${metricsText}\n\nRecent sessions:\n${workoutText}\n\nFocus areas:\n${focusText}\n\nNext race: ${race.name} on ${new Date(race.date).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })} (target ${race.targetTime}).`;
}

function fallbackReply(context: string, question: string) {
  return `Live ChatGPT responses require configuring OPENAI_API_KEY.\n\nBased on current Garmin context:\n${context}\n\nSuggested next step: keep endurance load steady, prioritise sleep quality, and taper intensity three days before your key session. Question asked: "${question}".`;
}
