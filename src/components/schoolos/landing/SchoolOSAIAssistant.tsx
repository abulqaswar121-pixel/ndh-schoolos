import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, PlayCircle, RotateCcw, Send, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { PRICING_CONFIG } from "@/config/pricing";
import { NDH_PARENT_CONTACT } from "@/data/ndhLinks";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  actionType?: "pilot" | "tutorials" | "pricing_page" | "contact_page" | undefined;
}

export interface SchoolOSAIAssistantProps {
  onStartPilot: () => void;
}

const QUICK_QUESTIONS = [
  "Termly & per-session pricing?",
  "How do report cards work?",
  "How do parents pay fees?",
  "Watch 20s role videos",
];

/**
 * NDH SchoolOS Sales Assistant — Matches ndh.com.ng AI Consultant design.
 * Strictly isolated from school/student database records (never reads student data).
 */
function generateSalesAnswer(query: string): {
  text: string;
  actionType?: ChatMessage["actionType"];
} {
  const q = query.toLowerCase();

  if (
    q.includes("price") ||
    q.includes("cost") ||
    q.includes("how much") ||
    q.includes("naira") ||
    q.includes("plan") ||
    q.includes("session") ||
    q.includes("term")
  ) {
    return {
      text: `Choose Termly or Per Session (3 Terms — Save 17%):\n• Starter (≤150 students): ₦30,000/term or ₦75,000/session (save ₦15,000).\n• Standard (≤500 students): ₦80,000/term or ₦200,000/session (save ₦40,000).\n• Large (500+ or multi-campus): Custom quote.\n• ${PRICING_CONFIG.pilotOfferBanner}.`,
      actionType: "pricing_page",
    };
  }

  if (
    q.includes("two section") ||
    q.includes("programme") ||
    q.includes("evening") ||
    q.includes("islamic") ||
    q.includes("vocational") ||
    q.includes("more than one")
  ) {
    return {
      text: "Yes — schools can run a single main programme or enable an optional second track with separate classes, grading, and combined or split fee bills.",
      actionType: "pilot",
    };
  }

  if (
    q.includes("report") ||
    q.includes("result") ||
    q.includes("score") ||
    q.includes("broadsheet") ||
    q.includes("ca1") ||
    q.includes("position") ||
    q.includes("tutorial") ||
    q.includes("video") ||
    q.includes("watch") ||
    q.includes("how")
  ) {
    return {
      text: "Enter CA 1, CA 2 & Exam once — totals, grades, positions, broadsheets & single-page A4 report cards generate automatically. Watch the 20-second voice video guides for each role.",
      actionType: "tutorials",
    };
  }

  if (
    q.includes("fee") ||
    q.includes("pay") ||
    q.includes("receipt") ||
    q.includes("debtor") ||
    q.includes("bank") ||
    q.includes("paystack")
  ) {
    return {
      text: "Bursars track class bills, sibling discounts, and debtors automatically. Parents pay online or submit transfer references for 1-click confirmation & numbered receipts.",
      actionType: "tutorials",
    };
  }

  if (
    q.includes("parent") ||
    q.includes("sms") ||
    q.includes("whatsapp") ||
    q.includes("phone") ||
    q.includes("contact") ||
    q.includes("support")
  ) {
    return {
      text: `Parents sign in with one phone number to view all their children's results & receipts. Support: ${NDH_PARENT_CONTACT.phoneDisplay} or ${NDH_PARENT_CONTACT.email}.`,
      actionType: "contact_page",
    };
  }

  return {
    text: `${PRICING_CONFIG.pilotOfferBanner}. Click 'Register School' for 2-minute setup, or watch the 20s voice video walkthroughs.`,
    actionType: "pilot",
  };
}

export function SchoolOSAIAssistant({
  onStartPilot,
}: SchoolOSAIAssistantProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello! I'm Amina from Najeeb Digital Hub. Ask me about Nigerian report cards, fee tracking, role permissions or our term plans (${PRICING_CONFIG.pilotOfferBanner}).`,
      actionType: "pilot",
    },
  ]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && typeof bottomRef.current?.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMessage = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: trimmed,
    };
    const reply = generateSalesAnswer(trimmed);
    const aiMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      sender: "ai",
      text: reply.text,
      actionType: reply.actionType,
    };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
  };

  const resetChat = () => {
    setMessages([
      {
        id: "welcome",
        sender: "ai",
        text: `Hello! I'm Amina from Najeeb Digital Hub. Ask me about Nigerian report cards, fee tracking, role permissions or our term plans (${PRICING_CONFIG.pilotOfferBanner}).`,
        actionType: "pilot",
      },
    ]);
  };

  return (
    <>
      {/* Official NDH Circular Floating Launcher (Matches ndh.com.ng bottom-right spot) */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close Ask Amina assistant" : "Open Ask Amina assistant"}
        aria-expanded={open}
        className="ai-assistant-launcher no-print"
      >
        {open ? (
          <X className="h-5 w-5 text-[#1a4a6e]" aria-hidden="true" />
        ) : (
          <>
            <span className="ai-assistant-orbit" aria-hidden="true" />
            <img
              src="/images/ndh-ai-assistant.png"
              alt="Ask Amina"
              width={816}
              height={816}
              className="ai-assistant-avatar"
            />
            <span className="ai-assistant-status" aria-hidden="true" />
          </>
        )}
      </button>

      {/* NDH Parent-Web Styled Chat Dialog */}
      {open && (
        <div
          role="dialog"
          aria-label="Amina NDH SchoolOS Guide"
          className="ai-assistant-dialog no-print"
        >
          {/* Header */}
          <header className="flex items-center justify-between gap-3 border-b border-[#e4e7ec] bg-[#eef1f6] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <img
                  src="/images/ndh-ai-assistant.png"
                  alt="Amina"
                  className="h-10 w-10 rounded-full border border-[#9ed9d6] bg-[#0b1220] object-cover object-[50%_8%]"
                />
                <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#067647]" />
              </div>
              <div>
                <div className="font-display text-sm font-bold text-[#0b1220]">
                  Amina · NDH Guide
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#667085]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1a4a6e]" />
                  <span>Online · NDH SchoolOS</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={resetChat}
                  className="cursor-pointer rounded-lg p-1.5 text-[#667085] hover:bg-white hover:text-[#0b1220]"
                  aria-label="Reset conversation"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-[#667085] hover:bg-white hover:text-[#0b1220]"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 space-y-3.5 overflow-y-auto bg-[#f5f6f8] p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "ai" && (
                  <img
                    src="/images/ndh-ai-assistant.png"
                    alt=""
                    className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-[#9ed9d6] bg-[#0b1220] object-cover object-[50%_8%]"
                  />
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${
                    msg.sender === "user"
                      ? "bg-[#1a4a6e] font-medium text-white"
                      : "border border-[#e4e7ec] bg-white font-medium text-[#0b1220] shadow-2xs"
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.sender === "ai" && msg.actionType && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e4e7ec] pt-2.5">
                      {msg.actionType === "pilot" && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            onStartPilot();
                          }}
                          className="cursor-pointer rounded-lg bg-[#1a4a6e] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#0c2340]"
                        >
                          Register Your School
                        </button>
                      )}
                      {msg.actionType === "pricing_page" && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            void navigate({ to: "/pricing" });
                          }}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#1a4a6e] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#0c2340]"
                        >
                          View Pricing <ArrowUpRight className="h-3 w-3" />
                        </button>
                      )}
                      {msg.actionType === "contact_page" && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            void navigate({ to: "/contact" });
                          }}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#1a4a6e] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#0c2340]"
                        >
                          Contact NDH <ArrowUpRight className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          void navigate({ to: "/tutorials" });
                        }}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9ed9d6] bg-[#edf7f6] px-3 py-1.5 text-[11px] font-bold text-[#1a4a6e] hover:bg-[#dff1ef]"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        Video Tutorials
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick Question Chips */}
          <div className="border-t border-[#e4e7ec] bg-white px-3.5 py-2.5">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="shrink-0 cursor-pointer rounded-full border border-[#e4e7ec] bg-[#f5f6f8] px-3 py-1.5 text-[11px] font-semibold text-[#0b1220] hover:border-[#9ed9d6] hover:bg-[#edf7f6] hover:text-[#1a4a6e]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-[#e4e7ec] bg-white p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about pricing, roles or setup..."
              aria-label="Ask Amina a question"
              className="h-9 flex-1 rounded-lg border border-[#d0d5dd] bg-[#f5f6f8] px-3 text-xs text-[#0b1220] outline-none focus:border-[#1a4a6e]"
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send question"
              disabled={!input.trim()}
              className="h-9 w-9 shrink-0 bg-[#1a4a6e] text-white hover:bg-[#0c2340]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
