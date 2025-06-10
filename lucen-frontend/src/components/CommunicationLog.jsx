// src/components/CommunicationLog.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

function CommunicationLog({ caseId, initialMessages = [] }) {
  const { session } = useAuth();
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const handlePostMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setIsPosting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/cases/${caseId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message_text: newMessage }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message);
      }

      setMessages((prev) => [...prev, result]); // Add new message to the list
      setNewMessage(""); // Clear input
    } catch (err) {
      console.error("Failed to post message:", err);
      // You could show an error to the user here
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-semibold">
                  {msg.firm_user?.email || "Unknown User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-center text-muted-foreground py-4">
            No messages yet.
          </p>
        )}
      </div>
      <form onSubmit={handlePostMessage} className="flex items-start space-x-2">
        <Textarea
          placeholder="Type a message or internal note..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          rows={2}
        />
        <Button type="submit" disabled={isPosting}>
          {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
        </Button>
      </form>
    </div>
  );
}

export default CommunicationLog;
