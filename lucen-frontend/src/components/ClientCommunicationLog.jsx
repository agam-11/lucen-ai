// src/components/ClientCommunicationLog.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

function ClientCommunicationLog({ token, initialMessages = [] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  console.log(initialMessages);
  const handlePostMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setIsPosting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/idd/${token}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message_text: newMessage }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message);
      }
      setMessages((prev) => [...prev, result]);
      setNewMessage("");
    } catch (err) {
      console.error("Failed to post message:", err);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="max-h-60 overflow-y-auto space-y-4 pr-2 border p-2 rounded-md">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender_type === "client" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-3 rounded-lg max-w-xs ${
                msg.sender_type === "client"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-800"
              }`}
            >
              <p className="text-sm">{msg.message_text}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.sender_type === "client"
                    ? "text-blue-200"
                    : "text-muted-foreground"
                }`}
              >
                {new Date(msg.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-center text-muted-foreground py-4">
            No messages yet.
          </p>
        )}
      </div>
      <form onSubmit={handlePostMessage} className="flex items-start space-x-2">
        <Textarea
          placeholder="Type a message to the firm..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          rows={2}
        />
        <Button type="submit" disabled={isPosting}>
          {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
        </Button>
      </form>
    </div>
  );
}

export default ClientCommunicationLog;
