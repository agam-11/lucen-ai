// src/components/CreateCaseForm.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";

// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// The `onCaseCreated` prop is a function we'll pass from the Dashboard to refresh the case list
function CreateCaseForm({ onCaseCreated, setOpen }) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [titleSnippet, setTitleSnippet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { session } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!session) {
      setError("You must be logged in to create a case.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          invention_title_snippet: titleSnippet,
        }),
      });

      const newCase = await response.json();

      if (!response.ok) {
        throw new Error(newCase.message || "Failed to create case");
      }

      // Let the Dashboard know a new case was created so it can refresh the list
      onCaseCreated(newCase);
      setOpen(false); // Close the dialog on success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="client-name" className="text-right">
            Client Name
          </Label>
          <Input
            id="client-name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="client-email" className="text-right">
            Client Email
          </Label>
          <Input
            id="client-email"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="title-snippet" className="text-right">
            Invention Title
          </Label>
          <Textarea
            id="title-snippet"
            value={titleSnippet}
            onChange={(e) => setTitleSnippet(e.target.value)}
            className="col-span-3"
            placeholder="(Optional)"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Case"}
        </Button>
      </div>
    </form>
  );
}

export default CreateCaseForm;
