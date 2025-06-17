// src/pages/DraftingStudioPage.jsx
import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import MasterDocumentEditor from "../components/MasterDocumentEditor";
import { Button } from "@/components/ui/button";
import VersionHistorySidebar from "@/components/VersionHistorySidebar";
import { History, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

function DraftingStudioPage() {
  const { caseId } = useParams();
  const { session } = useAuth();

  // --- NEW STATE to manage the history sidebar ---
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activePreview, setActivePreview] = useState(null); // Will hold { id, content, created_at }

  const handleSelectVersion = async (versionId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/drafts/versions/${versionId}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      // We need to fetch the full version details to get the date
      // For now, let's just set the content
      setActivePreview({
        id: versionId,
        content: data.fullContent,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to load version:", error);
    }
  };

  const fetchLatestDraft = () => {
    // This is a placeholder to reload the editor's main content
    // In a real app, it would fetch the latest version and load it.
    window.location.reload(); // Simple solution for now
  };

  const handleRestoreVersion = async () => {
    if (!activePreview) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/drafts/versions/${
          activePreview.id
        }/restore`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to restore version.");
      alert("Version restored successfully!");
      setActivePreview(null); // Go back to the latest version
      fetchLatestDraft(); // Reload the page to show the new latest version
    } catch (error) {
      console.error("Failed to restore:", error);
    }
  };

  return (
    <div className="flex  bg-background text-foreground">
      <div className="flex-grow h-full flex flex-col">
        <header className="flex items-center justify-between p-2 border-b">
          {/* <Link
            to={`/case/${caseId}`}
            className="text-sm text-blue-400 hover:underline"
          >
            &larr; Back to Case View
          </Link> */}
          <h1 className="text-3xl font-bold">Drafting Studio</h1>
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
          {/* --- NEW PREVIEW BANNER --- */}
          {activePreview && (
            <Alert variant="warning" className="m-4">
              <AlertTitle>You are viewing an older version</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                This version was saved at{" "}
                {new Date(activePreview.created_at).toLocaleString()}.
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePreview(null)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Back to Latest
                  </Button>
                  <Button size="sm" onClick={handleRestoreVersion}>
                    Restore this Version
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <MasterDocumentEditor
            caseId={caseId}
            previewContent={activePreview?.content ?? null}
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
