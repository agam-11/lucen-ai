// src/components/MasterDocumentEditor.jsx
import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// The MenuBar component is correct and unchanged
const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-2 p-2 border-b bg-muted rounded-md">
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

// --- THIS IS THE CORRECTED COMPONENT STRUCTURE ---
const MasterDocumentEditor = forwardRef(({ caseId }, ref) => {
  const { session } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Select a section and generate a draft...",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose dark:prose-invert max-w-none p-4 focus:outline-none",
      },
    },
  });

  // useEffect for loading the full document (placeholder for future)
  useEffect(() => {
    if (!editor) return;
    // In the future, we would fetch the full saved document here.
  }, [editor]);

  const handleSaveDocument = async () => {
    if (!editor) return;
    setIsSaving(true);
    setSaveStatus("");
    try {
      const htmlContent = editor.getHTML();
      console.log("Saving full document:", htmlContent);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSaveStatus("Document saved!");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (err) {
      setSaveStatus(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const generateSection = async (sectionType, instructions) => {
    if (!editor) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/cases/${caseId}/draft-section`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sectionType,
            attorneyInstructions: instructions,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message);
      }

      const sectionHTML = `<h2>${sectionType}</h2><p>${result.draftText.replace(
        /\n/g,
        "</p><p>"
      )}</p><p>&nbsp;</p>`;
      editor.chain().focus().insertContent(sectionHTML).run();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Correctly use useImperativeHandle with the forwarded ref
  useImperativeHandle(ref, () => ({
    generateSection,
  }));

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex justify-between items-center p-2 border-b">
        <MenuBar editor={editor} />
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">{saveStatus}</span>
          <Button onClick={handleSaveDocument} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Document"}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-red-500 p-2">{error}</p>}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div className="flex-grow overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

MasterDocumentEditor.displayName = "MasterDocumentEditor";

export default MasterDocumentEditor;
