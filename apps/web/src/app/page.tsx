"use client";

import { useState } from "react";
import { sendMessage, type BehaviorState } from "@/lib/api";

// Demo guests mirror contexts/demo/nai-harn-wellness-hideaway/demo_guests.json — hardcoded here
// only as UI convenience picker labels, not as a source of guest facts (those come from the API).
const DEMO_GUESTS = [
  { guestId: "guest_emma_001", guestName: "Emma Williams" },
  { guestId: "guest_daniel_002", guestName: "Daniel Kim" },
];

interface ChatMessage {
  id: string;
  role: "guest" | "assistant";
  text: string;
  state?: BehaviorState;
}

export default function GuestChatPage() {
  const [guestIndex, setGuestIndex] = useState(0);
  const [conversationId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const guest = DEMO_GUESTS[guestIndex];

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;

    setDraft("");
    setSending(true);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "guest", text }]);

    try {
      const result = await sendMessage({
        message: text,
        guestId: guest.guestId,
        guestName: guest.guestName,
        conversationId,
      });
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: result.responseText, state: result.state },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: err instanceof Error ? err.message : "Something went wrong sending that message.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page">
      {/* Placeholder for the property hero photo — replace with a real image asset later. */}
      <div className="hero-placeholder" role="img" aria-label="Nai Harn Wellness Hideaway — garden suite exterior at golden hour">
        [Image placeholder: Nai Harn Wellness Hideaway — garden suite exterior at golden hour]
      </div>

      <div className="header">
        <h1>Nai Harn Wellness Hideaway</h1>
        <span className="data-label">Demo Data — Not Actual Client Information</span>
      </div>

      <div className="guest-picker">
        <select
          value={guestIndex}
          onChange={(e) => setGuestIndex(Number(e.target.value))}
          aria-label="Chatting as"
        >
          {DEMO_GUESTS.map((g, i) => (
            <option key={g.guestId} value={i}>
              Chatting as {g.guestName}
            </option>
          ))}
        </select>
      </div>

      <div className="chat">
        {messages.length === 0 && (
          <div className="empty-state">
            Ask about breakfast times, request airport pickup, or anything else a guest might send —
            this calls the real orchestrator pipeline (safety guard → retrieval → classifier →
            response/request/handoff → verification).
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`bubble-row ${m.role}`}>
            <div className="bubble">
              {m.state && <span className={`state-badge ${m.state}`}>{m.state}</span>}
              <div>{m.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="composer">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Type a guest message…"
          disabled={sending}
        />
        <button onClick={handleSend} disabled={sending || !draft.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
