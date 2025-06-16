// src/pages/DraftingStudioPage.jsx
import React, { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import MasterDocumentEditor from "../components/MasterDocumentEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const patentSections = [
  { id: "Background", name: "Background of the Invention" },
  { id: "Summary", name: "Summary of the Invention" },
  // Add more sections later, e.g., 'Detailed Description', 'Claims'
];

function DraftingStudioPage() {
  const { caseId } = useParams();
  const editorRef = useRef(null);

  const [selectedSection, setSelectedSection] = useState("");
  const [instructions, setInstructions] = useState("");

  const handleGenerateClick = () => {
    if (editorRef.current && selectedSection) {
      editorRef.current.generateSection(selectedSection, instructions);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar for Controls */}
      <aside className="w-1/4 h-full border-r p-4 space-y-6 overflow-y-auto">
        <div>
          <Link
            to={`/case/${caseId}`}
            className="text-blue-600 hover:underline text-sm"
          >
            &larr; Back to Case Details
          </Link>
          <h1 className="text-2xl font-bold mt-2">Drafting Studio</h1>
        </div>

        <div className="space-y-2">
          <Label>1. Select a Section</Label>
          <div className="space-y-2">
            {patentSections.map((section) => (
              <Button
                key={section.id}
                variant={selectedSection === section.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedSection(section.id)}
              >
                {section.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">
            2. Provide Instructions (Optional)
          </Label>
          <Input
            id="instructions"
            placeholder="e.g., Emphasize cost-savings"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        <div>
          <Button
            className="w-full"
            onClick={handleGenerateClick}
            disabled={!selectedSection}
          >
            Generate Section
          </Button>
        </div>
      </aside>

      {/* Main Editor Area */}
      <main className="w-3/4 h-full overflow-y-auto">
        <MasterDocumentEditor ref={editorRef} caseId={caseId} />
      </main>
    </div>
  );
}

export default DraftingStudioPage;
