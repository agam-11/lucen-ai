// src/pages/DraftingStudioPage.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import AiDraftingStudio from "../components/AiDraftingStudio"; // Import the component

function DraftingStudioPage() {
  const { caseId } = useParams();

  return (
    <div className="p-4 sm:p-8 bg-gray-50 dark:bg-background min-h-screen">
      <div className="max-w-6xl mx-auto">
        <Link
          to={`/case/${caseId}`}
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          &larr; Back to Case Details
        </Link>
        <h1 className="text-3xl font-bold mb-4">AI Drafting Studio</h1>

        <div className="bg-white dark:bg-card p-4 sm:p-6 rounded-lg shadow-sm">
          <AiDraftingStudio caseId={caseId} />
        </div>
      </div>
    </div>
  );
}

export default DraftingStudioPage;
