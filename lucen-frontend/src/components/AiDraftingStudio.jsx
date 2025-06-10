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
import { useEditor, EditorContent } from "@tiptap/react"; // <-- 1. Import Tiptap hooks
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

// 2. Create a simple MenuBar component for editor controls
const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 border border-b-0 rounded-t-md bg-muted">
      <Button
        variant={editor.isActive("bold") ? "default" : "outline"}
        size="sm"
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Bold
      </Button>
      <Button
        variant={editor.isActive("italic") ? "default" : "outline"}
        size="sm"
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        Italic
      </Button>
      <Button
        variant={editor.isActive("bulletList") ? "default" : "outline"}
        size="sm"
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        List
      </Button>
    </div>
  );
};

// We pass caseId as a prop from the parent CaseView component
function AiDraftingStudio({ caseId }) {
  const { session } = useAuth();

  // State for the form controls
  const [sectionType, setSectionType] = useState("");
  const [attorneyInstructions, setAttorneyInstructions] = useState("");

  // State for the AI's response
  // const [draftText, setDraftText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- NEW STATE FOR SAVING ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // e.g., "Saved successfully!"

  // 3. Set up the Tiptap editor instance
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder:
          "The AI-generated draft will appear here. You can edit it directly.",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "min-h-[300px]",
      },
    },
  });

  // --- NEW: useEffect to fetch the saved draft when sectionType changes ---
  useEffect(() => {
    const fetchSavedDraft = async () => {
      // Don't fetch if no section is selected
      if (!sectionType || !session || !editor) {
        // setDraftText(""); // Clear the textarea if dropdown is reset
        return;
      }

      try {
        // We set loading to true for the Generate button to show it's busy
        setIsLoading(true);
        const response = await fetch(
          `${
            import.meta.env.VITE_API_BASE_URL
          }/api/cases/${caseId}/draft-section/${sectionType}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message);
        }
        editor.commands.setContent(result.draftText || "");
        // Set the textarea with the saved content
        // setDraftText(result.draftText);
      } catch (err) {
        // It's okay if a draft isn't found, just log other errors
        console.error("Could not fetch saved draft:", err.message);
        // setDraftText(""); // Start with a blank slate if no draft is found
        editor.commands.setContent("");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionType, caseId, editor]); // This effect re-runs whenever the user selects a different section

  const handleGenerateDraft = async () => {
    if (!sectionType || !editor) {
      setError("Please select a section to draft.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/${caseId}/draft-section`,
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

      // Set the editor's content with the AI's plain text response
      // Wrapping in <p> tags makes it valid HTML for the editor
      editor.commands.setContent(
        `<p>${result.draftText.replace(/\n/g, "</p><p>")}</p>`
      );

      // setDraftText(result.draftText);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW HANDLER FUNCTION TO SAVE THE DRAFT ---
  const handleSaveDraft = async () => {
    if (!sectionType || !editor) {
      setSaveStatus("Please select a section before saving.");
      return;
    }
    setIsSaving(true);
    setSaveStatus("");
    try {
      const htmlContent = editor.getHTML(); // Get content as an HTML string
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/cases/${caseId}/draft-section`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sectionType: sectionType,
            draftText: htmlContent,
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
        {/* <Label htmlFor="draft-output">Generated Draft</Label>
        <Textarea
          id="draft-output"
          placeholder="Select a section to begin. Your saved draft will appear here."
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={15}
          className="mt-1 font-mono text-sm"
        /> */}
        {/* --- 4. Replace the Textarea with our new Tiptap Editor --- */}
        <Label className="text-base font-semibold">Generated Draft</Label>
        <div className="mt-2 border rounded-md">
          <MenuBar editor={editor} />
          <EditorContent editor={editor} />
        </div>
        {/* --- END OF REPLACEMENT --- */}
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
