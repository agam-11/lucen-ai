// src/pages/DraftingStudioPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import MasterDocumentEditor from "../components/MasterDocumentEditor"; // We will put the editor logic back here
import VersionHistorySidebar from "../components/VersionHistorySidebar";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";

function DraftingStudioPage() {
  const { caseId } = useParams();
  const editorRef = useRef(null);

  // --- NEW STATE to manage the history sidebar ---
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState(null); // To hold content of an old version

  // This handler will be passed to the sidebar to set the preview content
  const handleSelectVersion = async (versionId) => {
    // In a real app, you would fetch the full_content for this versionId from the backend
    console.log("User selected version:", versionId);
    // For now, we'll just show an alert as a placeholder for previewing
    alert(
      `Previewing version ${versionId}. In the next step, we'll make this load into the editor.`
    );
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* The main editor and its parent layout */}
      <div className="flex-grow h-full flex flex-col">
        <header className="flex items-center justify-between p-2 border-b">
          <Link
            to={`/case/${caseId}`}
            className="text-sm text-blue-400 hover:underline"
          >
            &larr; Back to Case View
          </Link>
          <h1 className="text-lg font-semibold">Drafting Studio</h1>

          {/* The button to toggle the history sidebar */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          >
            <History className="mr-2 h-4 w-4" />
            Version History
          </Button>
        </header>
        <main className="flex-grow overflow-y-auto relative">
          <MasterDocumentEditor
            ref={editorRef}
            caseId={caseId}
            isPreviewing={!!previewContent}
          />
        </main>
      </div>

      {/* The Version History Sidebar */}
      {isHistoryOpen && (
        <aside className="w-80 h-full border-l">
          <VersionHistorySidebar
            caseId={caseId}
            onSelectVersion={handleSelectVersion}
          />
        </aside>
      )}
    </div>
  );
}

export default DraftingStudioPage;
