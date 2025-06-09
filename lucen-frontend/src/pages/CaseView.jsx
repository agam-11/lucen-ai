// src/pages/CaseView.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Loader2 } from "lucide-react"; // A nice icon for the delete button
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"; // Import Accordion
import ManualPriorArtUploader from "../components/ManualPriorArtUploader";
import RequestChangesForm from "../components/RequestChangesForm";
import { Badge } from "@/components/ui/badge";

// Add this helper function at the top of the file
const getPatentId = (doc, index = 0) => {
  return doc.publication_number || doc.patent_id || `result-${index}`;
};

// Let's create a reusable component for displaying data sections
function DetailSection({ title, data }) {
  if (!data) return null;
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold border-b pb-2 mb-3">{title}</h2>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {typeof data === "string" ? (
          <p className="text-gray-700 whitespace-pre-wrap">{data}</p>
        ) : (
          <pre className="text-sm bg-gray-100 p-2 rounded whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function CaseView() {
  const { caseId } = useParams();
  const { session } = useAuth();
  const [caseDetails, setCaseDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyButtonText, setCopyButtonText] = useState("Copy Link");

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

  const fetchCaseDetails = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/cases/${caseId}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to fetch case details");
      }
      const data = await response.json();
      console.log("1. Full data received from API:", data); // First debug log

      setCaseDetails(data);
      // --- NEW LOGIC: Check for saved search data and populate state ---
      if (data.latest_search) {
        setSuggestedKeywords(data.latest_search.keywords || []);
        setSearchResults(data.latest_search.results || []);
        if (data.latest_search.results) {
          setSearchAttempted(true); // If results exist, a search was attempted
        }
      }
      // --- END OF NEW LOGIC ---
      // --- NEW LOGIC: Check for saved analyses and populate state ---
      if (data.analyses && data.analyses.length > 0) {
        // The backend sends an array, but our state needs an object
        // Let's transform the array into an object keyed by patent number
        const analysesObject = data.analyses.reduce((acc, analysis, index) => {
          const patentId = getPatentId(analysis.prior_art_document, index);
          if (patentId) {
            // Only add if we have a valid patentId to use as a key
            acc[patentId] = analysis;
          }
          return acc;
        }, {});
        console.log(
          "4. Transformed analyses into state object:",
          analysesObject
        );

        setAnalyses(analysesObject);
      }
      // --- END OF NEW LOGIC ---
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [caseId, session]);

  useEffect(() => {
    fetchCaseDetails();
  }, [fetchCaseDetails]);

  // --- NEW: Function to copy the link to clipboard ---
  const handleCopyLink = (linkToCopy) => {
    navigator.clipboard.writeText(linkToCopy).then(
      () => {
        setCopyButtonText("Copied!");
        setTimeout(() => setCopyButtonText("Copy Link"), 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        setCopyButtonText("Failed to copy");
      }
    );
  };

  // --- NEW HANDLER FUNCTION TO CALL THE AI BACKEND ---
  const handleExtractKeywords = async () => {
    setIsExtracting(true);
    setAiError(null);
    setSuggestedKeywords([]); // Clear previous keywords

    try {
      const response = await fetch(
        `http://localhost:3001/api/cases/${caseId}/extract-keywords`,
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

  // --- NEW FUNCTIONS FOR MANAGING KEYWORDS ---
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
        `http://localhost:3001/api/cases/${caseId}/search`,
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

  // --- NEW HANDLER FUNCTION FOR AI ANALYSIS ---
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
        `http://localhost:3001/api/cases/${caseId}/analyze-prior-art`,
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

  // --- NEW HANDLER FUNCTION FOR UPDATING STATUS ---
  const handleUpdateStatus = async (analysisId, newStatus) => {
    // Find the key (patentId) for the analysis we're updating
    const patentId = Object.keys(analyses).find(
      (key) => analyses[key].id === analysisId
    );
    if (!patentId) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/analyses/${analysisId}/status`,
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

  // Add this function inside your CaseView component
  const handleChangesRequested = () => {
    // The simplest way to see the new status is to refetch all case data
    setIsLoading(true);
    // We can just re-call the fetch function from the useEffect
    // To do this cleanly, let's wrap the fetch logic in its own function
    fetchCaseDetails();
  };
  // Note: You may need to move the `fetchCaseDetails` function outside the useEffect
  // so it can be called from here. Let's do that.

  // Add this function inside your CaseView component
  const handleManualUploadSuccess = (newDocument) => {
    setCaseDetails((prev) => ({
      ...prev,
      documents: [...(prev.documents || []), newDocument],
    }));
  };

  // --- NEW HANDLER FUNCTION for sharing a document ---
  const handleShareDocument = async (docId) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/documents/${docId}/share`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const updatedDoc = await response.json();
      if (!response.ok) {
        throw new Error(updatedDoc.message);
      }

      // Update the state to reflect the change without a full page reload
      setCaseDetails((prev) => ({
        ...prev,
        documents: prev.documents.map((doc) =>
          doc.id === docId
            ? { ...doc, is_shared: true, client_review_status: "pending" }
            : doc
        ),
      }));
    } catch (err) {
      console.error("Failed to share document:", err);
      // Optionally, show an error message to the user
    }
  };

  if (isLoading) return <div className="p-8">Loading case details...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!caseDetails) return <div className="p-8">Case not found.</div>;

  const disclosureData = caseDetails.invention_disclosure?.data || {};

  // Construct the full client link
  const clientLink = `${window.location.origin}/idd/${caseDetails.idd_secure_link_token}`;

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/dashboard"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          &larr; Back to Dashboard
        </Link>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h1 className="text-3xl font-bold mb-2">Case Details</h1>
          <p className="text-lg text-gray-600">
            Client: {caseDetails.client_name} ({caseDetails.client_email})
          </p>
          <p className="text-sm text-gray-500">Case ID: {caseDetails.id}</p>
          <p className="mt-2">
            Status:{" "}
            <span className="font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {caseDetails.status}
            </span>
          </p>
        </div>

        {/* --- NEW: Secure Link Section --- */}
        {/* Only show this section if the client has NOT submitted their form yet */}
        {caseDetails.status &&
          caseDetails.status.includes("Awaiting Client IDD") && (
            <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-blue-800 dark:text-blue-200">
                  Client Submission Link
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  The client has not yet submitted their invention disclosure.
                  You can resend them this secure link.
                </p>
                <div className="flex items-center space-x-2">
                  <Input value={clientLink} readOnly />
                  <Button onClick={() => handleCopyLink(clientLink)}>
                    {copyButtonText}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        {/* --- NEW SECTION: Request Changes Form --- */}
        {/* Only show this if the IDD has been submitted */}
        {caseDetails.status === "IDD Submitted" && (
          <Card className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="text-yellow-800 dark:text-yellow-200">
                Review Invention Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                Review the client's submission. If changes are needed, provide
                your comments below and send it back to the client to edit.
              </p>
              <RequestChangesForm
                caseId={caseId}
                onRequestSent={handleChangesRequested}
              />
            </CardContent>
          </Card>
        )}

        {/* --- NEW SECTION: AI PRIOR ART INVESTIGATOR --- */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold border-b pb-2 mb-3">
            AI Prior Art Investigator
          </h2>
          <div className="bg-white dark:bg-card p-4 rounded-lg shadow-sm">
            {!suggestedKeywords.length > 0 ? (
              // View before keywords are generated
              <>
                <p className="text-muted-foreground mb-4">
                  Click the button below to use AI to suggest keywords for a
                  prior art search.
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
                      e.key === "Enter" &&
                      (e.preventDefault(), handleAddKeyword())
                    }
                  />
                  <Button type="button" onClick={handleAddKeyword}>
                    Add
                  </Button>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSearch}>
                    Search with these Keywords
                  </Button>
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
                <p className="text-red-500 text-sm">
                  Search Error: {searchError}
                </p>
              ) : searchAttempted && searchResults.length > 0 ? (
                // If search is done and we have results, show the list
                <div>
                  <h3 className="font-semibold mb-2">
                    Prior Art Search Results:
                  </h3>
                  <div className="border rounded-md">
                    {searchResults.map((result, index) => {
                      const patentId = getPatentId(result, index); // Use helper function

                      const analysis = analyses[patentId];
                      const isCurrentlyAnalyzing = analyzingId === patentId;
                      // --- Helper to determine card background color ---
                      const getStatusRingColor = (status) => {
                        if (status === "relevant")
                          return "ring-2 ring-green-500";
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
                            {result.publication_number} -{" "}
                            {result.publication_date}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {result.snippet}
                          </p>
                          {/* --- NEW: Analysis Button and Display Logic --- */}
                          <div className="mt-4">
                            <Button
                              onClick={() =>
                                handleAnalyzePriorArt(result, index)
                              }
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
                                    <p className="mb-3">{analysis.summary}</p>

                                    <h4 className="font-semibold">
                                      Similarity Score:{" "}
                                      {analysis.similarityScore}/10
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
        </div>

        {/* --- PASTE THIS NEW SECTION --- */}
        {/* Only show the drafting studio if the client has submitted their IDD */}
        {caseDetails.invention_disclosure && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold border-b pb-2 mb-3">
              AI Drafting Studio
            </h2>
            <div className="bg-white dark:bg-card p-4 rounded-lg shadow-sm flex items-center justify-between">
              <p className="text-muted-foreground">
                Generate and refine application sections.
              </p>
              <Link to={`/case/${caseId}/draft`}>
                <Button>Open Drafting Studio</Button>
              </Link>
            </div>
          </div>
        )}

        {/* --- NEW SECTION: Manual Prior Art --- */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold border-b pb-2 mb-3">
            Manually Add Prior Art
          </h2>
          <div className="bg-white dark:bg-card p-4 rounded-lg shadow-sm">
            <ManualPriorArtUploader
              caseId={caseId}
              onUploadSuccess={handleManualUploadSuccess}
            />
          </div>
        </div>
        {/* --- NEW SECTION: Communication Log --- */}
        {/* <div className="mb-6">
          <h2 className="text-xl font-semibold border-b pb-2 mb-3">
            Communication Log
          </h2>
          <div className="bg-white dark:bg-card p-4 rounded-lg shadow-sm">
            {caseDetails && (
              <CommunicationLog
                caseId={caseId}
                initialMessages={caseDetails.messages}
              />
            )}
          </div>
        </div> */}

        {caseDetails.invention_disclosure ? (
          <>
            <DetailSection
              title="Inventor(s) Details"
              data={disclosureData.inventorDetails}
            />
            <DetailSection
              title="Title of Invention"
              data={disclosureData.inventionTitle}
            />
            <DetailSection
              title="Background of the Invention"
              data={disclosureData.background}
            />
            <DetailSection
              title="Detailed Description"
              data={disclosureData.detailedDescription}
            />
            <DetailSection
              title="Novelty and Non-Obviousness"
              data={disclosureData.novelty}
            />
            <DetailSection
              title="Known Prior Art"
              data={disclosureData.knownPriorArt}
            />

            {/* --- Section for Uploaded Documents --- */}
            {/* <div className="mb-6">
              <h2 className="text-xl font-semibold border-b pb-2 mb-3">
                Associated Documents
              </h2>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                {caseDetails.documents && caseDetails.documents.length > 0 ? (
                  <ul>
                    {caseDetails.documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="border-b last:border-b-0 py-2"
                      >
                        <a
                          href={doc.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {doc.file_name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No documents were uploaded.</p>
                )}
              </div>
            </div> */}
            {/* --- UPDATED "Associated Documents" section --- */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold border-b pb-2 mb-3">
                Associated Documents
              </h2>
              <div className="bg-white dark:bg-card p-4 rounded-lg shadow-sm">
                {caseDetails.documents && caseDetails.documents.length > 0 ? (
                  <ul className="space-y-3">
                    {caseDetails.documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50"
                      >
                        <div>
                          <a
                            href={doc.signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 font-semibold hover:underline"
                          >
                            {doc.file_name}
                          </a>
                          {doc.notes && (
                            <p className="text-sm text-muted-foreground">
                              Notes: {doc.notes}
                            </p>
                          )}
                          {doc.is_shared && (
                            <Badge variant="secondary" className="mt-1">
                              Shared with Client - Status:{" "}
                              {doc.client_review_status}
                            </Badge>
                          )}
                        </div>
                        {!doc.is_shared && (
                          <Button
                            onClick={() => handleShareDocument(doc.id)}
                            size="sm"
                            variant="outline"
                          >
                            Share with Client
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    No documents were uploaded.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-8 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600">
              The client has not submitted their Invention Disclosure Document
              yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CaseView;
