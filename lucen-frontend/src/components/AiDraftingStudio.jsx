// src/components/AiDraftingStudio.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// We pass caseId as a prop from the parent CaseView component
function AiDraftingStudio({ caseId }) {
  const { session } = useAuth();

  // State for the form controls
  const [sectionType, setSectionType] = useState("");
  const [attorneyInstructions, setAttorneyInstructions] = useState("");

  // State for the AI's response
  const [draftText, setDraftText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- NEW STATE FOR SAVING ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // e.g., "Saved successfully!"

  // --- NEW: useEffect to fetch the saved draft when sectionType changes ---
  useEffect(() => {
    const fetchSavedDraft = async () => {
      // Don't fetch if no section is selected
      if (!sectionType || !session) {
        setDraftText(""); // Clear the textarea if dropdown is reset
        return;
      }

      try {
        // We set loading to true for the Generate button to show it's busy
        setIsLoading(true);
        const response = await fetch(
          `http://localhost:3001/api/cases/${caseId}/draft-section/${sectionType}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message);
        }

        // Set the textarea with the saved content
        setDraftText(result.draftText);
      } catch (err) {
        // It's okay if a draft isn't found, just log other errors
        console.error("Could not fetch saved draft:", err.message);
        setDraftText(""); // Start with a blank slate if no draft is found
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedDraft();
  }, [sectionType, caseId, session]); // This effect re-runs whenever the user selects a different section

  const handleGenerateDraft = async () => {
    if (!sectionType) {
      setError("Please select a section to draft.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:3001/api/cases/${caseId}/draft-section`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sectionType,
            attorneyInstructions,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to generate draft.");
      }

      setDraftText(result.draftText);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW HANDLER FUNCTION TO SAVE THE DRAFT ---
  const handleSaveDraft = async () => {
    if (!sectionType) {
      setSaveStatus("Please select a section before saving.");
      return;
    }
    setIsSaving(true);
    setSaveStatus("");
    try {
      const response = await fetch(
        `http://localhost:3001/api/cases/${caseId}/draft-section`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sectionType: sectionType,
            draftText: draftText,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message);
      }

      setSaveStatus("Draft saved!");
      setTimeout(() => setSaveStatus(""), 3000); // Clear message after 3 seconds
    } catch (err) {
      setSaveStatus(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="section-type">Section to Draft</Label>
          <Select onValueChange={setSectionType} value={sectionType}>
            <SelectTrigger id="section-type">
              <SelectValue placeholder="Select a section..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Background">
                Background of the Invention
              </SelectItem>
              <SelectItem value="Summary">Summary of the Invention</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="attorney-instructions">
            Additional Instructions (Optional)
          </Label>
          <Input
            id="attorney-instructions"
            placeholder="e.g., Emphasize the cost-saving aspects."
            value={attorneyInstructions}
            onChange={(e) => setAttorneyInstructions(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Button
          onClick={handleGenerateDraft}
          disabled={isLoading || !sectionType}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Loading..." : "Generate Draft with AI"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="mt-4">
        <Label htmlFor="draft-output">Generated Draft</Label>
        <Textarea
          id="draft-output"
          placeholder="Select a section to begin. Your saved draft will appear here."
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={15}
          className="mt-1 font-mono text-sm"
        />
        {/* --- ADD THE SAVE DRAFT BUTTON AND STATUS MESSAGE --- */}
        <div className="flex items-center justify-end mt-2 space-x-4">
          <span className="text-sm text-muted-foreground">{saveStatus}</span>
          <Button onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AiDraftingStudio;
