// src/pages/ClientIddForm.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

// Import all necessary shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ClientIddForm() {
  const { token } = useParams();

  // State for all form fields
  const [inventorDetails, setInventorDetails] = useState("");
  const [inventionTitle, setInventionTitle] = useState("");
  const [background, setBackground] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [novelty, setNovelty] = useState("");
  const [knownPriorArt, setKnownPriorArt] = useState("");
  const [drawingFile, setDrawingFile] = useState(null);

  // State for loading and status messages
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  // useEffect to fetch existing draft data when the page loads
  useEffect(() => {
    const fetchDraftData = async () => {
      if (!token) return;
      try {
        const response = await fetch(
          `http://localhost:3001/api/idd/${token}/data`
        );
        if (!response.ok) return;
        const data = await response.json();

        // Populate form fields with draft data if it exists
        setInventorDetails(data.inventorDetails || "");
        setInventionTitle(data.inventionTitle || "");
        setBackground(data.background || "");
        setDetailedDescription(data.detailedDescription || "");
        setNovelty(data.novelty || "");
        setKnownPriorArt(data.knownPriorArt || "");
      } catch (error) {
        console.error("Could not fetch draft data:", error);
      }
    };
    fetchDraftData();
  }, [token]);

  // Helper function to get the current state of text fields
  const getFormDataObject = () => ({
    inventorDetails,
    inventionTitle,
    background,
    detailedDescription,
    novelty,
    knownPriorArt,
  });

  // Function to handle saving a draft
  const handleSaveDraft = async () => {
    setLoading(true);
    setSaveStatus("");
    try {
      const response = await fetch(`http://localhost:3001/api/idd/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getFormDataObject()),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setSaveStatus("Draft saved successfully!");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error) {
      setSaveStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle the final submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveStatus("");

    const submissionData = new FormData();
    const textData = getFormDataObject();
    for (const key in textData) {
      submissionData.append(key, textData[key]);
    }
    if (drawingFile) {
      submissionData.append("drawingFile", drawingFile);
    }

    try {
      const response = await fetch(`http://localhost:3001/api/idd/${token}`, {
        method: "POST",
        body: submissionData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      alert(
        "Thank you! Your invention disclosure has been submitted successfully."
      );
    } catch (error) {
      console.error("Submission failed:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">
            Invention Disclosure Document
          </CardTitle>
          <CardDescription>
            Your progress can be saved. Please submit when you are ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} id="idd-form" className="space-y-6">
            {/* All form fields are now included below */}

            <div>
              <Label
                htmlFor="inventor-details"
                className="text-lg font-semibold"
              >
                Inventor(s) Details
              </Label>
              <Textarea
                id="inventor-details"
                placeholder="e.g., John Doe - john.doe@example.com - 123 Main St..."
                value={inventorDetails}
                onChange={(e) => setInventorDetails(e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label
                htmlFor="invention-title"
                className="text-lg font-semibold"
              >
                Title of Invention
              </Label>
              <Input
                id="invention-title"
                placeholder="A descriptive title for your invention"
                value={inventionTitle}
                onChange={(e) => setInventionTitle(e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="background" className="text-lg font-semibold">
                Background of the Invention
              </Label>
              <p className="text-sm text-gray-500">
                What problem does it solve? What is the current state of the
                art?
              </p>
              <Textarea
                id="background"
                rows={5}
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label
                htmlFor="detailed-description"
                className="text-lg font-semibold"
              >
                Detailed Description of the Invention
              </Label>
              <p className="text-sm text-gray-500">
                How does it work? What are the key components, steps, and
                functionalities?
              </p>
              <Textarea
                id="detailed-description"
                rows={10}
                value={detailedDescription}
                onChange={(e) => setDetailedDescription(e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="drawing-file" className="text-lg font-semibold">
                Drawings/Sketches
              </Label>
              <p className="text-sm text-gray-500">
                Upload any relevant drawings, sketches, or diagrams (e.g., PDF,
                JPG, PNG).
              </p>
              <Input
                id="drawing-file"
                type="file"
                onChange={(e) => setDrawingFile(e.target.files[0])}
                className="mt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-foreground file:text-primary hover:file:bg-primary/20"
              />
            </div>

            <div>
              <Label htmlFor="novelty" className="text-lg font-semibold">
                What is Novel and Non-Obvious?
              </Label>
              <p className="text-sm text-gray-500">
                What do you believe is new about your invention?
              </p>
              <Textarea
                id="novelty"
                rows={5}
                value={novelty}
                onChange={(e) => setNovelty(e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label
                htmlFor="known-prior-art"
                className="text-lg font-semibold"
              >
                Known Prior Art (if any)
              </Label>
              <p className="text-sm text-gray-500">
                Are you aware of any similar products or patents?
              </p>
              <Textarea
                id="known-prior-art"
                rows={3}
                value={knownPriorArt}
                onChange={(e) => setKnownPriorArt(e.target.value)}
                className="mt-2"
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-6">
          <div className="text-sm text-green-600 font-medium">{saveStatus}</div>
          <div className="flex">
            <Button
              type="button"
              variant="outline"
              className="mr-4"
              onClick={handleSaveDraft}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Draft"}
            </Button>
            <Button type="submit" form="idd-form" disabled={loading}>
              {loading ? "Submitting..." : "Submit Disclosure"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default ClientIddForm;
