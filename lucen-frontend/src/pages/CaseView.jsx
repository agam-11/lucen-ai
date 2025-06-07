// src/pages/CaseView.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react"; // A nice icon for the delete button

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

  useEffect(() => {
    const fetchCaseDetails = async () => {
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
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCaseDetails();
  }, [caseId, session]);

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
                    {searchResults.map((result, index) => (
                      <div
                        key={result.patent_number || index}
                        className="p-3 border-b last:border-b-0"
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
                          {result.patent_number} - {result.publication_date}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {result.snippet}
                        </p>
                      </div>
                    ))}
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
            <div className="mb-6">
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
