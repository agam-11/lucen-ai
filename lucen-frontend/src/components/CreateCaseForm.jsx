// src/components/CreateCaseForm.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function CreateCaseForm({ onCaseCreated, setOpen }) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [titleSnippet, setTitleSnippet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- NEW: State to hold the generated link ---
  const [generatedLink, setGeneratedLink] = useState("");
  const [copyButtonText, setCopyButtonText] = useState("Copy Link");

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

      onCaseCreated(newCase);

      // --- NEW LOGIC: Instead of closing, show the link ---
      const token = newCase.idd_secure_link_token;
      const fullLink = `${window.location.origin}/idd/${token}`;
      setGeneratedLink(fullLink);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Function to copy the link to clipboard ---
  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink).then(
      () => {
        setCopyButtonText("Copied!");
        setTimeout(() => setCopyButtonText("Copy Link"), 2000); // Reset after 2 seconds
      },
      (err) => {
        console.error("Could not copy text: ", err);
        setCopyButtonText("Failed to copy");
      }
    );
  };

  // If a link has been generated, show the success view. Otherwise, show the form.
  if (generatedLink) {
    return (
      <div className="py-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-medium">Case Created Successfully!</h3>
          <p className="text-sm text-muted-foreground">
            Send this secure link to your client.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Input id="link" value={generatedLink} readOnly />
          <Button type="button" onClick={handleCopyLink}>
            {copyButtonText}
          </Button>
        </div>
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => setOpen(false)}
        >
          Done
        </Button>
      </div>
    );
  }

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
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Case"}
        </Button>
      </div>
    </form>
  );
}

export default CreateCaseForm;
