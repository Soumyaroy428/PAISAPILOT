"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bot,
  Sparkles,
  Send,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Calendar,
  Wallet,
  Loader2,
  TrendingUp,
  CreditCard,
  MessageSquare,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";
import { formatPaiseToINR } from "@/client/lib/utils";
import { AnalyticsPeriod } from "@/server/services/analytics.service";
import {
  AssistantMessage,
  AssistantResponsePayload,
} from "@/server/models/assistant";

const SAMPLE_PROMPTS = [
  "How is my spending this month compared to my budget?",
  "Can I afford a ₹15,000 purchase right now?",
  "What are my top 3 expense categories?",
  "How can I improve my savings rate?",
  "Show my overall financial summary for this period",
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  engine?: "gemini-api" | "grounded-deterministic";
  timestamp: string;
  suggestedFollowUps?: string[];
}

export default function AssistantPage() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = React.useState("");
  const [period, setPeriod] = React.useState<AnalyticsPeriod>("this_month");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [lastContext, setLastContext] = React.useState<AssistantResponsePayload["context"] | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSendMessage(promptToSend?: string) {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || loading) return;

    setInputPrompt("");
    setError(null);

    const userMsgId = "user-" + Date.now();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          period,
          history: historyPayload,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to get AI response.");
      }

      const data: AssistantResponsePayload = json.data;
      setLastContext(data.context);

      const botMsgId = "bot-" + Date.now();
      const newBotMsg: ChatMessage = {
        id: botMsgId,
        role: "assistant",
        content: data.message,
        engine: data.engine,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        suggestedFollowUps: data.suggestedFollowUps,
      };

      setMessages((prev) => [...prev, newBotMsg]);
    } catch (err: any) {
      setError(err.message || "Failed to communicate with AI Assistant.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleResetChat() {
    setMessages([]);
    setError(null);
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center space-x-2 pt-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center">
              PaisaPilot Copilot
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              <ShieldCheck className="h-3 w-3 mr-1 inline" /> Single Source of Truth
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask questions about your finances, check purchase affordability, and optimize savings. All figures strictly grounded in integer paise ledger.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-muted/40 p-1 rounded-lg border border-border">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1.5" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
              className="bg-transparent text-xs font-semibold focus:outline-none pr-2 py-1"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="this_year">This Year</option>
              <option value="all_time">All Time</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetChat}
            disabled={messages.length === 0}
            className="text-xs font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Clear Chat
          </Button>
        </div>
      </div>

      {/* Grounding Context Strip (If Available) */}
      {lastContext && (
        <div className="p-3 bg-muted/40 rounded-xl border border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Analysis Window</span>
            <span className="font-semibold text-foreground">{lastContext.periodLabel}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Liquid Balance</span>
            <span className="font-semibold text-foreground">{formatPaiseToINR(lastContext.reconciledBalancePaise)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Remaining Budget</span>
            <span className="font-semibold text-foreground">{formatPaiseToINR(lastContext.budgetRemainingPaise)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Savings Rate</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {lastContext.savingsRatePercent.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Chat Area */}
      <Card className="border-border shadow-sm min-h-[500px] flex flex-col justify-between">
        <CardContent className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto max-h-[600px]">
          {messages.length === 0 ? (
            <div className="py-12 text-center space-y-5">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-foreground">
                  How can I help you today?
                </h3>
                <p className="text-xs text-muted-foreground">
                  I analyze your actual income, expenses, and accounts in real-time. I never invent figures or expose raw databases.
                </p>
              </div>

              {/* Sample Prompt Pills */}
              <div className="pt-2 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                {SAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleSendMessage(p)}
                    className="text-xs text-left bg-muted/60 hover:bg-muted text-foreground border border-border px-3 py-2 rounded-xl transition-colors font-medium shadow-2xs"
                  >
                    💬 {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={m.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-xl rounded-2xl p-4 space-y-2 shadow-xs ${
                        isUser
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted/50 border border-border text-foreground"
                      }`}
                    >
                      {/* Message Header */}
                      <div className="flex items-center justify-between text-[11px] opacity-75 pb-1 border-b border-border/20">
                        <span className="font-semibold flex items-center">
                          {isUser ? (
                            "You"
                          ) : (
                            <>
                              <Bot className="h-3.5 w-3.5 mr-1" />
                              PaisaPilot Copilot
                              {m.engine && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] ml-2 py-0 px-1 border-border/50 uppercase"
                                >
                                  {m.engine === "gemini-api" ? "Gemini 3.8 Flash" : "Grounded Engine"}
                                </Badge>
                              )}
                            </>
                          )}
                        </span>
                        <span>{m.timestamp}</span>
                      </div>

                      {/* Content with whitespace formatting */}
                      <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                        {m.content}
                      </div>

                      {/* Action & Followups for Assistant */}
                      {!isUser && (
                        <div className="pt-2 space-y-2">
                          <div className="flex items-center justify-end space-x-2 text-[10px]">
                            <button
                              onClick={() => handleCopy(m.id, m.content)}
                              className="text-muted-foreground hover:text-foreground inline-flex items-center"
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check className="h-3 w-3 mr-1 text-emerald-500" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 mr-1" /> Copy
                                </>
                              )}
                            </button>
                          </div>

                          {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                            <div className="pt-2 border-t border-border/20 space-y-1">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                                Suggested follow-ups:
                              </span>
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {m.suggestedFollowUps.map((q) => (
                                  <button
                                    key={q}
                                    onClick={() => handleSendMessage(q)}
                                    className="text-[11px] text-left bg-background/80 hover:bg-background text-primary border border-border/50 px-2.5 py-1 rounded-lg transition-colors font-medium"
                                  >
                                    &rarr; {q}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 border border-border rounded-2xl p-4 flex items-center space-x-3 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Analyzing your verified ledger facts...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-muted/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask anything (e.g. 'Can I buy a ₹12,000 phone?', 'Where did my salary go?')..."
              disabled={loading}
              className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="rounded-xl px-4 font-semibold shadow-xs"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5 hidden sm:inline" /> Send
                </>
              )}
            </Button>
          </form>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            🛡️ Protected by PaisaPilot Grounding Guardrails. All answers reference authoritative integer paise calculations.
          </p>
        </div>
      </Card>
    </div>
  );
}
