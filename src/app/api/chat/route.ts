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

  const context = await buildContextSummary();

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new NextResponse(fallbackReply(context, userMessage), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
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
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `${context}\n\nQuestion: ${userMessage.slice(0, 4000)}`,
          },
        ],
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      console.error('[chat] OpenAI error', errorText);
      return new NextResponse(fallbackReply(context, userMessage), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = response.body!.getReader();
        let buffer = '';
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) continue;
              if (trimmed === 'data: [DONE]') {
                controller.close();
                return;
              }
              if (!trimmed.startsWith('data:')) continue;
              try {
                const json = JSON.parse(trimmed.slice(5));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch (error) {
                console.error('[chat] stream parse error', error);
              }
            }
          }

          if (buffer) {
            controller.enqueue(encoder.encode(buffer));
          }
          controller.close();
        } catch (error) {
          console.error('[chat] stream failure', error);
          controller.enqueue(
            encoder.encode(fallbackReply(context, userMessage)),
          );
          controller.close();
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('[chat] request failed', error);
    return new NextResponse(fallbackReply(context, userMessage), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function buildContextSummary() {
  const [metrics, workouts, focus, race] = await Promise.all([
    getKeyMetrics(),
    getRecentWorkouts(3),
    getTrainingFocus(),
    getNextRacePlan(),
  ]);

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
