'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  streaming?: boolean;
};

export type ChatContext = {
  readinessScore: number;
  weeklyDistance: string;
  nextRace: string;
};

type ChatInterfaceProps = {
  context: ChatContext;
  endpoint?: string;
};

export function ChatInterface({ context, endpoint = '/api/chat' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'm-0',
      role: 'assistant',
      content: `Hey! I'm your Garmin AI coach. You're carrying a readiness score of ${context.readinessScore} with ${context.weeklyDistance} logged this week. Ask anything — pacing, fatigue, or how to sharpen for next race.`,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || isThinking) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      createdAt: new Date().toISOString(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      streaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Unable to reach AI service');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          setMessages(prev =>
            prev.map(message =>
              message.id === assistantId
                ? { ...message, content: message.content + chunk }
                : message,
            ),
          );
        }
      }

      const remainder = decoder.decode();
      if (remainder) {
        setMessages(prev =>
          prev.map(message =>
            message.id === assistantId
              ? { ...message, content: message.content + remainder }
              : message,
          ),
        );
      }

      setMessages(prev =>
        prev.map(message =>
          message.id === assistantId ? { ...message, streaming: false } : message,
        ),
      );
      reader.releaseLock();
    } catch (error) {
      console.error('[chat] assistant request failed', error);
      const fallback = `${buildPlaceholderReply(prompt, context)}\n\n(Enable OPENAI_API_KEY to receive live answers.)`;
      setMessages(prev =>
        prev.map(message =>
          message.id === assistantId
            ? { ...message, content: fallback, streaming: false }
            : message,
        ),
      );
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div
        ref={containerRef}
        className="h-[480px] overflow-y-auto rounded-xl border border-border/50 bg-background p-5"
      >
        <div className="space-y-3">
          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-3 rounded-xl border border-border/60 bg-background p-4"
      >
        <Textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask your coach…"
          className="flex-1 resize-none border-none p-0 shadow-none focus-visible:ring-0"
          rows={3}
        />
        <Button type="submit" disabled={!input.trim() || isThinking}>
          <SendHorizonal className="mr-2 size-4" />
          Send
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (message.streaming && !message.content.trim()) {
    return (
      <div className="ml-auto flex w-fit items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground shadow-sm">
        <Loader2 className="size-3 animate-spin" />
        Preparing response…
      </div>
    );
  }

  const baseClasses =
    'max-w-[78%] rounded-lg px-4 py-2 text-sm leading-relaxed shadow-sm whitespace-pre-wrap';

  const formatted = message.content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\n- /g, '\n• ')
    .replace(/#{1,6}\s*/g, '')
    .trim();

  return (
    <div
      className={cn(
        baseClasses,
        isUser ? 'ml-auto bg-primary text-primary-foreground' : 'border border-border/60 bg-background text-foreground',
      )}
    >
      {formatted}
    </div>
  );
}

function buildPlaceholderReply(prompt: string, context: ChatContext) {
  const suggestions = [
    `Based on your readiness score of ${context.readinessScore}, schedule one lighter aerobic day before the next threshold session. Keeping ${context.weeklyDistance} steady will leave headroom for sharpening.`,
    `You're trending well for ${context.nextRace}. Layer strides after your mid-week run and aim for relaxed 5 × 20 s pickups to stay sharp without adding load.`,
    `Mix a technique day into your week: 30 minutes Z2 with 6 × 30-second form surges. It reinforces economy while you maintain ${context.weeklyDistance}.`,
  ];

  const hash = prompt.length % suggestions.length;
  return suggestions[hash];
}
