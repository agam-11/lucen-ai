// src/features/case-view/PriorArtInvestigator.jsx
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom"; // New hook to get data from the parent layout
// import { useAuth } from "../hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2 } from "lucide-react"; // A nice icon for the delete button
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"; // Import Accordion

const getPatentId = (doc, index = 0) => {
  return doc.publication_number || doc.patent_id || `result-${index}`;
};

function PriorArtInvestigator() {
  const { caseDetails, fetchCaseDetails } = useOutletContext(); // Get caseDetails from the parent CaseView layout
  const { session } = useAuth();
  const caseId = caseDetails?.id;

  // --- NEW STATE FOR THE AI FEATURE ---
  const [isExtracting, setIsExtracting] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState([]);
  const [aiError, setAiError] = useState(null);

  // --- NEW STATE FOR INTERACTIVITY ---
  const [newKeyword, setNewKeyword] = useState("");

  // --- NEW STATE FOR SEARCH RESULTS ---
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const [searchAttempted, setSearchAttempted] = useState(false);

  // --- NEW STATE FOR ANALYSIS ---
  // We'll store analyses in an object, with the patent number as the key
  const [analyses, setAnalyses] = useState({});
  const [analyzingId, setAnalyzingId] = useState(null); // Tracks which patent is currently being analyzed
  const [isBuildingMemory, setIsBuildingMemory] = useState(false);

  // This useEffect loads the saved search data when the component loads
  useEffect(() => {
    if (caseDetails && caseDetails.latest_search) {
      setSuggestedKeywords(caseDetails.latest_search.keywords || []);
      setSearchResults(caseDetails.latest_search.results || []);
      if (caseDetails.latest_search.results) {
        setSearchAttempted(true);
      }
    }
    if (caseDetails && caseDetails.analyses) {
      const analysesObject = caseDetails.analyses.reduce(
        (acc, analysis, index) => {
          const patentId = getPatentId(analysis.prior_art_document, index);
          if (patentId) {
            acc[patentId] = analysis;
          }
          return acc;
        },
        {}
      );
      setAnalyses(analysesObject);
    }
  }, [caseDetails]);

  const handleExtractKeywords = async () => {
    setIsExtracting(true);
    setAiError(null);
    setSuggestedKeywords([]); // Clear previous keywords

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/cases/${caseId}/extract-keywords`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to extract keywords");
      }

      // The backend returns a comma-separated string, so we split it into an array
      const keywordsArray = result.keywords.split(",").map((kw) => kw.trim());
      setSuggestedKeywords(keywordsArray);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword && !suggestedKeywords.includes(newKeyword.trim())) {
      setSuggestedKeywords([...suggestedKeywords, newKeyword.trim()]);
      setNewKeyword(""); // Clear the input field
    }
  };

  const handleDeleteKeyword = (indexToDelete) => {
    setSuggestedKeywords((keywords) =>
      keywords.filter((_, index) => index !== indexToDelete)
    );
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]); // Clear previous results
    setSearchAttempted(true);
    setAnalyses({}); // We'll clear old analyses when a new search is performed

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/cases/${caseId}/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ keywords: suggestedKeywords }),
        }
      );

      const results = await response.json();
      if (!response.ok) {
        throw new Error(results.message || "Failed to perform search.");
      }

      setSearchResults(results || []); // Ensure results is an array
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAnalyzePriorArt = async (priorArtDocument, index) => {
    const patentId = getPatentId(priorArtDocument, index);

    setAnalyzingId(patentId); // Set loading state for this specific item
    console.log(
      "1. handleAnalyzePriorArt started. Document:",
      priorArtDocument
    );

    try {
      console.log("2. Preparing to fetch analysis from the backend...");

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/cases/${caseId}/analyze-prior-art`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ priorArtDocument }), // Send the specific document to be analyzed
        }
      );
      console.log(
        "3. Received response from backend. Status:",
        response.status
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Analysis failed.");
      }
      console.log("4. Analysis successful. Setting state.");
      setAnalyses((prevAnalyses) => ({
        ...prevAnalyses,
        [patentId]: result,
      }));

      // Add the new analysis to our state object
      setAnalyses((prevAnalyses) => ({
        ...prevAnalyses,
        [patentId]: result,
      }));
    } catch (err) {
      // Store the error message for this specific item
      console.error("5. CAUGHT ERROR in handleAnalyzePriorArt:", err);

      setAnalyses((prevAnalyses) => ({
        ...prevAnalyses,
        [patentId]: { error: err.message },
      }));
    } finally {
      console.log("6. FINALLY block reached. Clearing loading state.");

      setAnalyzingId(null); // Clear the loading state
    }
  };

  const handleUpdateStatus = async (analysisId, newStatus) => {
    // Find the key (patentId) for the analysis we're updating
    const patentId = Object.keys(analyses).find(
      (key) => analyses[key].id === analysisId
    );
    if (!patentId) return;

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/analyses/${analysisId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const updatedAnalysis = await response.json();
      if (!response.ok) {
        throw new Error(updatedAnalysis.message || "Failed to update status");
      }

      // Update the local state to immediately reflect the change
      setAnalyses((prev) => ({
        ...prev,
        [patentId]: updatedAnalysis,
      }));
    } catch (err) {
      // You could add error handling here, e.g., show a toast message
      console.error("Status update failed:", err);
    }
  };

  const handleBuildMemory = async () => {
    setIsBuildingMemory(true);
    setAiError(null); // Clear previous errors
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/rag/${caseId}/build-memory`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message);
      }

      // Success! The parent's fetchCaseDetails will be called to update the status.
      alert(
        "AI Memory has been built! You can now proceed to the Drafting Studio."
      );
      fetchCaseDetails();
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsBuildingMemory(false);
    }
  };

  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold border-b pb-2 mb-3">
        AI Prior Art Investigator
      </h1>

      <div className="bg-white mb-8 dark:bg-card p-4 rounded-lg shadow-sm">
        {!suggestedKeywords.length > 0 ? (
          // View before keywords are generated
          <>
            <p className="text-muted-foreground mb-4">
              Click the button below to use AI to suggest keywords for a prior
              art search.
            </p>
            <Button
              onClick={handleExtractKeywords}
              disabled={isExtracting || !caseDetails.invention_disclosure}
            >
              {isExtracting ? "Analyzing..." : "Suggest Keywords with AI"}
            </Button>
          </>
        ) : (
          // View after keywords are generated
          <>
            <h3 className="font-semibold mb-2">Review & Refine Keywords</h3>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md">
              {suggestedKeywords.map((kw, index) => (
                <span
                  key={index}
                  className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium pl-3 pr-1 py-1 rounded-full dark:bg-blue-900/50 dark:text-blue-300"
                >
                  {kw}
                  <button
                    onClick={() => handleDeleteKeyword(index)}
                    className="ml-2 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-2 mt-4">
              <Input
                type="text"
                placeholder="Add another keyword"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleAddKeyword())
                }
              />
              <Button type="button" onClick={handleAddKeyword}>
                Add
              </Button>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSearch}>Search with these Keywords</Button>
            </div>
          </>
        )}
        {aiError && (
          <p className="text-red-500 mt-4 text-sm">Error: {aiError}</p>
        )}
        {/* --- NEW SECTION TO DISPLAY SEARCH RESULTS --- */}
        <div className="mt-4">
          {isSearching ? (
            <p className="text-center">Searching Google Patents...</p>
          ) : searchError ? (
            <p className="text-red-500 text-sm">Search Error: {searchError}</p>
          ) : searchAttempted && searchResults.length > 0 ? (
            // If search is done and we have results, show the list
            <div>
              <h3 className="font-semibold mb-2">Prior Art Search Results:</h3>
              <div className="border rounded-md">
                {searchResults.map((result, index) => {
                  const patentId = getPatentId(result, index); // Use helper function

                  const analysis = analyses[patentId];
                  const isCurrentlyAnalyzing = analyzingId === patentId;
                  // --- Helper to determine card background color ---
                  const getStatusRingColor = (status) => {
                    if (status === "relevant") return "ring-2 ring-green-500";
                    if (status === "dismissed")
                      return "ring-2 ring-red-500 opacity-60";
                    return "ring-1 ring-gray-200 dark:ring-gray-700";
                  };

                  return (
                    <div
                      key={patentId} // Use the patentId we already defined
                      className={`p-4 rounded-lg mb-2 ${getStatusRingColor(
                        analysis?.review_status
                      )}`}
                    >
                      <a
                        href={result.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        {result.title}
                      </a>
                      <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                        {result.publication_number} - {result.publication_date}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {result.snippet}
                      </p>
                      {/* --- NEW: Analysis Button and Display Logic --- */}
                      <div className="mt-4">
                        <Button
                          onClick={() => handleAnalyzePriorArt(result, index)}
                          disabled={isCurrentlyAnalyzing || analysis} // Disable if analyzing or already analyzed
                          variant="outline"
                          size="sm"
                        >
                          {isCurrentlyAnalyzing && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {isCurrentlyAnalyzing
                            ? "Analyzing..."
                            : analysis
                            ? "Analysis Complete"
                            : "Analyze with AI"}
                        </Button>

                        {analysis && !analysis.error && (
                          <Accordion
                            type="single"
                            collapsible
                            className="w-full mt-3"
                          >
                            <AccordionItem value="item-1">
                              <AccordionTrigger>
                                View AI Analysis
                              </AccordionTrigger>
                              <AccordionContent className="p-4 bg-gray-50 dark:bg-gray-800 rounded-b-md">
                                <h4 className="font-semibold">Summary:</h4>
                                <p className="mb-3">
                                  {analysis.analysis_summary}
                                  {/* changed here */}
                                </p>

                                <h4 className="font-semibold">
                                  Similarity Score: {analysis.similarity_score}
                                  /10
                                  {console.log(
                                    ` similarity score ${analysis.similarity_score}`
                                  )}
                                </h4>

                                <h4 className="font-semibold mt-3">
                                  Similarities:
                                </h4>
                                <ul className="list-disc pl-5">
                                  {analysis.similarities?.map((s, i) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>

                                <h4 className="font-semibold mt-3">
                                  Differences:
                                </h4>
                                <ul className="list-disc pl-5">
                                  {analysis.differences?.map((d, i) => (
                                    <li key={i}>{d}</li>
                                  ))}
                                </ul>
                                {/* --- NEW ACTION BUTTONS --- */}
                                <div className="mt-4 pt-4 border-t flex justify-end items-center space-x-2">
                                  <span className="text-sm text-muted-foreground">
                                    Mark as:
                                  </span>
                                  <Button
                                    onClick={() =>
                                      handleUpdateStatus(
                                        analysis.id,
                                        "relevant"
                                      )
                                    }
                                    disabled={
                                      analysis.review_status === "relevant"
                                    }
                                    size="sm"
                                    variant={
                                      analysis.review_status === "relevant"
                                        ? "default"
                                        : "outline"
                                    }
                                    className="bg-green-100 text-green-800 hover:bg-green-200"
                                  >
                                    Relevant
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleUpdateStatus(
                                        analysis.id,
                                        "dismissed"
                                      )
                                    }
                                    disabled={
                                      analysis.review_status === "dismissed"
                                    }
                                    size="sm"
                                    variant={
                                      analysis.review_status === "dismissed"
                                        ? "destructive"
                                        : "outline"
                                    }
                                  >
                                    Dismiss
                                  </Button>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                        {analysis && analysis.error && (
                          <p className="text-red-500 text-sm mt-2">
                            Analysis failed: {analysis.error}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : searchAttempted && searchResults.length === 0 ? (
            // If search is done and we have NO results, show this message
            <div className="text-center p-4 border-2 border-dashed rounded-lg">
              <p className="font-semibold">No Results Found</p>
              <p className="text-sm text-muted-foreground">
                Try using broader or different keywords.
              </p>
            </div>
          ) : null}
        </div>
      </div>
      {/* AI memory building card */}
      {searchAttempted &&
        !isSearching &&
        caseDetails?.status !== "Drafting Ready" && (
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-green-800 dark:text-green-200">
                {caseDetails?.status === "Drafting Ready"
                  ? "Update AI Memory"
                  : "Ready to Draft?"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                {caseDetails?.status === "Drafting Ready"
                  ? "If you've changed your 'Relevant' documents, you can rebuild the AI's memory with the latest information."
                  : `Finalize your prior art research. This will build the AI's long-term memory for this case based on your "Relevant" documents, preparing it for the drafting stage.`}
              </p>
              <Button onClick={handleBuildMemory} disabled={isBuildingMemory}>
                {isBuildingMemory && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isBuildingMemory
                  ? "Preparing AI..."
                  : caseDetails?.status === "Drafting Ready"
                  ? "Rebuild AI Memory"
                  : "Finalize Research & Prepare for Drafting"}
              </Button>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

export default PriorArtInvestigator;
