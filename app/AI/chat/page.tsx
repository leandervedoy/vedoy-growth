"use client"

import React, { useState } from "react";

type Message = { id: string; role: "user" | "assistant"; text: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", text: "Hello — ask me anything." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: trimmed };
    setMessages((s) => [...s, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const botMsg: Message = { id: Date.now().toString() + "-bot", role: "assistant", text: data.reply ?? "(no reply)" };
      setMessages((s) => [...s, botMsg]);
    } catch (e: any) {
      const errMsg: Message = { id: Date.now().toString() + "-err", role: "assistant", text: `Error: ${e.message || String(e)}` };
      setMessages((s) => [...s, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white text-gray-900">
      <h1 className="text-2xl font-bold mb-4">AI Chat</h1>
      <div className="border rounded p-4 max-w-3xl mx-auto flex flex-col gap-4">
        <div className="flex-1 space-y-3 max-h-96 overflow-auto">
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
              <div className={`inline-block p-2 rounded ${m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-black"}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            className="flex-1 p-2 border rounded"
            placeholder="Type your message..."
          />
          <button onClick={sendMessage} disabled={loading} className="px-4 py-2 bg-black text-white rounded">
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
