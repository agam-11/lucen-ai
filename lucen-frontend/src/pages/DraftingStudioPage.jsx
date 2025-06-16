// src/pages/DraftingStudioPage.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import MasterDocumentEditor from "../components/MasterDocumentEditor";
import { Button } from "@/components/ui/button";

function DraftingStudioPage() {
  const { caseId } = useParams();

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-2 border-b">
        <Link
          to={`/case/${caseId}`}
          className="text-sm text-blue-400 hover:underline"
        >
          &larr; Back to Case View
        </Link>
        <h1 className="text-lg font-semibold">Drafting Studio</h1>
      </header>
      <main className="flex-grow overflow-y-auto relative">
        <MasterDocumentEditor caseId={caseId} />
      </main>
    </div>
  );
}

export default DraftingStudioPage;
