// src/components/RequestChangesForm.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// We pass caseId and a success handler as props
function RequestChangesForm({ caseId, onRequestSent }) {
  const { session } = useAuth();
  const [comments, setComments] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comments.trim()) {
      setError("Comments cannot be empty.");
      return;
    }
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:3001/api/cases/${caseId}/request-changes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ comments }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message);
      }

      // Call the success handler passed from the parent to update the UI
      onRequestSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="firm-comments">Feedback for Client</Label>
        <Textarea
          id="firm-comments"
          placeholder="e.g., 'Please provide more detail on the materials used for the grinding blade...'"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={5}
          className="mt-1"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSending}>
          {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSending ? "Sending..." : "Request Changes from Client"}
        </Button>
      </div>
    </form>
  );
}

export default RequestChangesForm;
