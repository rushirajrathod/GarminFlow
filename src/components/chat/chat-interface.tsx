'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type ChatContext = {
  readinessScore: number;
  weeklyDistance: string;
  nextRace: string;
};

type ChatInterfaceProps = {
  context: ChatContext;
  presets?: string[];
  endpoint?: string;
};

export function ChatInterface({ context, presets, endpoint = '/api/chat' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'm-0',
      role: 'assistant',
      content: `Hey! I'm your Garmin AI coach. You're carrying a readiness score of ${context.readinessScore} with ${context.weeklyDistance} logged this week. Ask anything — pacing, fatigue, or how to sharpen for ${context.nextRace}.`,
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
    if (!input.trim() || isThinking) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!response.ok) {
        throw new Error('Unable to reach AI service');
      }

      const data: { reply?: string } = await response.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          data.reply ?? buildPlaceholderReply(userMessage.content, context),
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `${buildPlaceholderReply(userMessage.content, context)}\n\n(Enable OPENAI_API_KEY to receive live answers.)`,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={containerRef}
        className="h-[420px] overflow-y-auto rounded-2xl border border-border/60 bg-card p-4"
      >
        <div className="space-y-3">
          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isThinking && (
            <div className="ml-auto flex w-fit items-center gap-2 rounded-2xl border border-border/70 bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Thinking…
            </div>
          )}
        </div>
      </div>

      {presets?.length ? (
        <div className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Prompt presets
          </span>
          <div className="grid gap-2 md:grid-cols-3">
            {presets.map(prompt => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                className="justify-start text-left"
                onClick={() => setInput(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask something like “How should I taper before race day?”"
          rows={3}
        />
        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={!input.trim() || isThinking}>
            <SendHorizonal className="mr-2 size-4" />
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={
        isUser
          ? 'ml-auto max-w-[80%] rounded-2xl border border-border bg-primary text-primary-foreground px-4 py-2 text-sm shadow-sm'
          : 'max-w-[80%] rounded-2xl border border-border/70 bg-muted/40 px-4 py-2 text-sm text-foreground'
      }
    >
      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
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
