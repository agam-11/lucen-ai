// src/components/MasterDocumentEditor.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { EditorToolbar } from "./EditorToolbar";
import { Check, Loader2 } from "lucide-react";
import { SlashCommand } from "../lib/tiptap/SlashCommand"; // <-- 1. IMPORT OUR NEW EXTENSION

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

function MasterDocumentEditor({ caseId }) {
  const { session } = useAuth();
  const [saveStatus, setSaveStatus] = useState("All changes saved");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder:
          "Type your draft or type // followed by a command and press Enter...",
      }),
      SlashCommand,
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none p-8 focus:outline-none h-full",
      },
    },
    onTransaction: ({ transaction }) => {
      const slashCommandMeta = transaction.getMeta("slashCommand");
      if (slashCommandMeta) {
        handleNaturalLanguageCommand(slashCommandMeta.command);
      }
    },

    onUpdate: () => {
      setSaveStatus("Unsaved changes");
    },
  });

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

  // useEffect(() => {
  //   if (!editor) return;

  //   const handleEnterKey = (event) => {
  //     if (event.key === "Enter" && !event.shiftKey) {
  //       console.log("--- A. ENTER KEY DETECTED ---");

  //       const { from } = editor.state.selection;
  //       const textBefore = editor.state.doc.textBetween(
  //         Math.max(0, from - 200),
  //         from,
  //         "\n"
  //       );
  //       const match = textBefore.match(/\/\/([\s\S]*)$/);

  //       if (match) {
  //         event.preventDefault();
  //         handleNaturalLanguageCommand(match[1].trim());
  //         return true;
  //       }
  //     }
  //     return false;
  //   };

  //   // This is a workaround because handleKeyDown can be overwritten.
  //   // A more robust solution might involve a custom Tiptap extension.
  //   editor.setOptions({
  //     editorProps: {
  //       ...editor.options.editorProps,
  //       handleKeyDown: handleEnterKey,
  //     },
  //   });
  // }, [editor, handleNaturalLanguageCommand]);

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
          `${import.meta.env.VITE_API_BASE_URL}/api/drafts/${caseId}/versions`,
          {
            method: "POST", // We use POST to create a new version every time
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
        <EditorToolbar editor={editor} />
        <div className="flex items-center space-x-2 pr-4">
          {saveStatus === "Saving..." && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {saveStatus === "All changes saved" && (
            <Check className="h-4 w-4 text-green-500" />
          )}
          <span className="text-sm text-muted-foreground">{saveStatus}</span>
        </div>
      </div>

      {/* The rest of the component */}
      {editor && (
        <AiBubbleMenu
          editor={editor}
          onCommand={handleNaturalLanguageCommand}
        />
      )}
      <EditorContent className="flex-grow overflow-y-auto" editor={editor} />
    </div>
  );
}

export default MasterDocumentEditor;
