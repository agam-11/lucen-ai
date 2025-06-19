// src/components/MasterDocumentEditor.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { EditorToolbar } from "./EditorToolbar";
import { Check, Loader2, MoreVertical } from "lucide-react";
import { SlashCommand } from "../lib/tiptap/SlashCommand"; // <-- 1. IMPORT OUR NEW EXTENSION
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import ImageResize from "tiptap-extension-resize-image";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// --- This is the "Highlight-to-Action" menu ---
const AiBubbleMenu = ({ editor, onCommand }) => {
  if (!editor) return null;

  const handleAction = (action) => {
    const text = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to
    );
    if (!text) return;
    // We create a natural language command from the action and selected text
    const command = `${action} the following text: "${text}"`;
    // We call the main command handler with a null range, so it replaces the selection
    onCommand(command, {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    });
  };

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, placement: "top-start" }}
    >
      <div className="flex bg-card p-1 rounded-md shadow-lg border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction("Rephrase")}
        >
          Rephrase
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction("Summarize")}
        >
          Summarize
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction("Expand on")}
        >
          Expand
        </Button>
      </div>
    </BubbleMenu>
  );
};

function MasterDocumentEditor({ caseId, previewContent }) {
  const { session } = useAuth();
  const [saveStatus, setSaveStatus] = useState("All changes saved");
  // --- NEW STATE for the milestone dialog ---
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [milestoneError, setMilestoneError] = useState("");
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder:
          "Type your draft or type // followed by a command and press Enter...",
      }),
      SlashCommand,
      Image,
      ImageResize,
      TextAlign.configure({
        types: ["heading", "paragraph"], // Allow alignment on text and images
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none p-8 focus:outline-none h-full",
      },
      handleDrop: function (event) {
        // Prevent the browser's default file handling
        event.preventDefault();

        // Check if the dropped item contains files
        if (
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files.length > 0
        ) {
          const files = event.dataTransfer.files;
          // Loop through the files (in case user drops multiple)
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            // Check if it's an image
            if (file.type.startsWith("image/")) {
              // Call our existing upload function for the first image found
              handleImageUpload(file);
              return true; // We've handled the event
            }
          }
        }
        return false; // We didn't handle it, let Tiptap continue
      },
      handlePaste: function (view, event) {
        // Get the items from the clipboard
        const items = (event.clipboardData || event.originalEvent.clipboardData)
          .items;
        for (const item of items) {
          // Check if the item is an image file
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              // Prevent the default paste behavior
              event.preventDefault();
              // Call our existing upload function
              handleImageUpload(file);
              return true; // We've handled the event
            }
          }
        }
        return false; // We didn't handle it, let Tiptap continue
      },
    },
    onTransaction: ({ transaction }) => {
      const slashCommandMeta = transaction.getMeta("slashCommand");
      if (slashCommandMeta) {
        handleNaturalLanguageCommand(slashCommandMeta.command);
      }
    },

    onUpdate: ({ editor }) => {
      // Only set to "Unsaved" if there is actual content in the editor
      if (editor.getText().trim().length > 0) {
        setSaveStatus("Unsaved changes");
      }
    },
  });

  // Paste this entire useEffect block inside your MasterDocumentEditor component

  useEffect(() => {
    const fetchLatestDraft = async () => {
      // Don't run if the editor isn't ready or we don't have a session
      if (!editor || !session) return;

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/drafts/${caseId}/latest`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
        if (!response.ok) throw new Error("Could not load initial draft.");

        const data = await response.json();

        // Set the editor's content with the loaded text
        // We use a boolean 'false' to prevent the cursor from jumping
        editor.commands.setContent(data.fullContent || "", false);
      } catch (error) {
        console.error("Failed to fetch latest draft:", error);
        // We can leave the editor empty if fetching fails
      }
    };

    fetchLatestDraft();
  }, [caseId, session, editor]); // This runs once when the component is ready

  useEffect(() => {
    if (!editor) return;

    // If we are in preview mode, show the old content and lock the editor
    if (previewContent !== null) {
      editor.setEditable(false);
      editor.commands.setContent(previewContent);
    } else {
      // Otherwise, make sure the editor is editable
      editor.setEditable(true);
      // In a real app, you would load the LATEST draft here.
    }
  }, [previewContent, editor]);

  const handleNaturalLanguageCommand = useCallback(
    async (command, range = null) => {
      if (!editor || !command || !session) return;

      const { from, to } = range || editor.state.selection;
      const fullDocumentContent = editor.getHTML();
      const selectedText = editor.state.doc.textBetween(from, to);

      const commandRange = range
        ? range
        : { from: Math.max(0, from - command.length - 2), to };

      editor
        .chain()
        .focus()
        .setMeta("preventUpdate", true)
        .deleteRange(commandRange)
        .insertContent("✨ Thinking...")
        .run();

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/command/${caseId}/command`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              command,
              fullDocumentContent,
              selectedText,
            }),
          }
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message);
        }

        const currentContent = editor.state.doc.textBetween(
          0,
          editor.state.doc.content.size
        );
        const thinkingText = "✨ Thinking...";
        const thinkingIndex = currentContent.indexOf(thinkingText);

        if (thinkingIndex !== -1) {
          const thinkingRange = {
            from: thinkingIndex + 1,
            to: thinkingIndex + 1 + thinkingText.length,
          };
          editor
            .chain()
            .focus()
            .deleteRange(thinkingRange)
            .insertContent(
              `<p>${result.draftText.replace(/\n/g, "</p><p>")}</p>`
            )
            .run();
        }
      } catch (error) {
        console.error("AI Command Failed:", error);
        const currentContent = editor.state.doc.textBetween(
          0,
          editor.state.doc.content.size
        );
        const thinkingText = "Thinking...";
        const thinkingIndex = currentContent.indexOf(thinkingText);
        if (thinkingIndex !== -1) {
          const thinkingRange = {
            from: thinkingIndex + 1,
            to: thinkingIndex + 1 + thinkingText.length,
          };
          editor
            .chain()
            .focus()
            .deleteRange(thinkingRange)
            .insertContent(`<p><strong>Error:</strong> ${error.message}</p>`)
            .run();
        }
      }
    },
    [editor, caseId, session]
  );

  // --- NEW HANDLER for creating a named milestone ---
  const handleCreateMilestone = async () => {
    if (!versionName.trim() || !editor || !session) return;
    setMilestoneError("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/drafts/${caseId}/milestones`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ versionName }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to create milestone.");
      }
      setSaveStatus("Milestone saved!");
      setIsMilestoneDialogOpen(false);
      setVersionName("");
    } catch (error) {
      setMilestoneError(error.message);
    }
  };

  // Add this new function inside your MasterDocumentEditor.jsx component

  const handleImageUpload = (file) => {
    if (!file || !editor || !session) return;

    // A small check for image types
    if (!file.type.startsWith("image/")) {
      alert("Only image files can be uploaded.");
      return;
    }

    // --- Part 1: Create a temporary placeholder ---
    // We create a temporary URL so the user sees the image immediately
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Insert a temporary, blurred image into the editor
      editor
        .chain()
        .focus()
        .setImage({ src: reader.result, style: "filter: blur(4px);" })
        .run();
    };

    // --- Part 2: Upload the file to the backend ---
    const upload = async () => {
      const formData = new FormData();
      formData.append("imageFile", file);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/drafts/${caseId}/images`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
          }
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message);
        }

        // --- Part 3: Replace the placeholder with the real URL ---
        // Find the temporary image we just inserted and update its source to the permanent URL
        const transaction = editor.state.tr;
        editor.state.doc.descendants((node, pos) => {
          if (
            node.type.name === "image" &&
            node.attrs.src.startsWith("data:")
          ) {
            transaction.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              src: result.imageUrl,
              style: "",
            });
          }
        });
        editor.view.dispatch(transaction);
      } catch (error) {
        console.error("Image upload failed:", error);
        // Optionally, remove the placeholder image on failure
        // editor.chain().focus().deleteRange(/* range of placeholder */).run();
        alert(`Image upload failed: ${error.message}`);
      }
    };

    reader.onloadend = () => {
      upload();
    };
  };

  // Add this function inside your MasterDocumentEditor component
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Add this new useEffect block inside MasterDocumentEditor.jsx

  // --- The Auto-Save Logic (Debouncing) ---
  useEffect(() => {
    // If the status is not "Unsaved changes", do nothing.
    if (saveStatus !== "Unsaved changes") return;

    // Set the status to "Saving..." immediately for visual feedback
    console.log("saving...");
    setSaveStatus("Saving...");

    // Set a timer to save the document after 2 seconds of inactivity
    const timer = setTimeout(async () => {
      console.log("we entered timeout...");

      if (!editor || !session) return;
      try {
        const htmlContent = editor.getHTML();
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/drafts/${caseId}/auto-save`,
          {
            method: "PUT", // We use POST to create a new version every time
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ fullContent: htmlContent }),
          }
        );

        if (!response.ok) {
          throw new Error("Save failed");
        }
        console.log("all changes saved...");

        setSaveStatus("All changes saved");
      } catch (error) {
        console.error("Auto-save failed:", error);
        setSaveStatus("Save failed");
      }
    }, 2000); // 2-second delay

    // This is the cleanup function. If the user types again, it clears the old timer.
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor?.state.doc, caseId, session]);

  // Replace the entire return statement in MasterDocumentEditor.jsx
  return (
    <div className="h-full relative flex flex-col">
      {/* This is the new header section */}
      <div className="flex justify-between items-center border-b">
        <EditorToolbar editor={editor} onImageUploadClick={triggerFileInput} />

        {/* --- THIS IS THE NEW "SPLIT BUTTON" UI --- */}
        <div className="flex items-center space-x-1 pr-4">
          <div className="flex items-center space-x-2">
            {saveStatus === "Saving..." && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {saveStatus === "All changes saved" && (
              <Check className="h-4 w-4 text-green-500" />
            )}
            <span className="text-sm text-muted-foreground">{saveStatus}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setIsMilestoneDialogOpen(true)}>
                Save as named version...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* --- END OF NEW UI --- */}

        {/* <div className="flex items-center space-x-2 pr-4">
          {saveStatus === "Saving..." && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {saveStatus === "All changes saved" && (
            <Check className="h-4 w-4 text-green-500" />
          )}
          <span className="text-sm text-muted-foreground">{saveStatus}</span>
        </div> */}
      </div>

      {/* The rest of the component */}
      {editor && (
        <AiBubbleMenu
          editor={editor}
          onCommand={handleNaturalLanguageCommand}
        />
      )}
      <EditorContent className="flex-grow overflow-y-auto" editor={editor} />
      {/* --- NEW DIALOG for naming a version --- */}
      <Dialog
        open={isMilestoneDialogOpen}
        onOpenChange={setIsMilestoneDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a Milestone</DialogTitle>
            <DialogDescription>
              Give this version of the document a name to save it permanently in
              the version history.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="version-name">Version Name</Label>
            <Input
              id="version-name"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g., First Draft of Claims"
            />
            {milestoneError && (
              <p className="text-sm text-red-500">{milestoneError}</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleCreateMilestone}>Save Milestone</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* --- ADD THE HIDDEN FILE INPUT HERE --- */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleImageUpload(e.target.files[0])}
        className="hidden"
        accept="image/png, image/jpeg, image/gif"
      />
    </div>
  );
}

export default MasterDocumentEditor;
