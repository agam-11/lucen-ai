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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // A new component for comments
import ClientReviewSection from "../components/ClientReviewSection"; // <-- Import new component

function ClientIddForm() {
  const { token } = useParams();

  // --- NEW State to track if the form is submitted ---
  // const [isSubmitted, setIsSubmitted] = useState(false);

  // State for all form fields
  const [inventorDetails, setInventorDetails] = useState("");
  const [inventionTitle, setInventionTitle] = useState("");
  const [background, setBackground] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [novelty, setNovelty] = useState("");
  const [knownPriorArt, setKnownPriorArt] = useState("");
  const [drawingFile, setDrawingFile] = useState(null);

  // State for loading and status messages
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [saveStatus, setSaveStatus] = useState("");
  // --- NEW STATE for firm comments ---
  const [firmComments, setFirmComments] = useState(null);
  const [sharedDocuments, setSharedDocuments] = useState([]); // <-- NEW state for shared docs

  // The single source of truth for what to display
  const [caseStatus, setCaseStatus] = useState(null);

  // const [messages, setMessages] = useState([]); // <-- NEW state for messages

  // useEffect to fetch existing draft data when the page loads
  useEffect(() => {
    const fetchDraftData = async () => {
      setLoading(true);
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/idd/${token}/data`
        );
        if (!response.ok) {
          setLoading(false);
          return;
        }
        const {
          data,
          // isSubmitted: alreadySubmitted,
          // messages: loadedMessages,
          firmComments: loadedComments,
          sharedDocuments: loadedDocs,
          caseStatus: dbcaseStatus,
        } = await response.json();

        // Populate form fields with draft data if it exists
        setCaseStatus(dbcaseStatus); // This is now our master switch

        console.log("here we go from useeffect");
        console.log(`ma chda ${dbcaseStatus}`);

        // Populate form fields with draft data if it exists
        setInventorDetails(data.inventorDetails || "");
        setInventionTitle(data.inventionTitle || "");
        setBackground(data.background || "");
        setDetailedDescription(data.detailedDescription || "");
        setNovelty(data.novelty || "");
        setKnownPriorArt(data.knownPriorArt || "");
        setFirmComments(loadedComments); // <-- Set the comments state
        setSharedDocuments(loadedDocs || []); // <-- Set the documents state

        // setMessages(loadedMessages || []); // <-- Set the messages state
      } catch (error) {
        console.error("Could not fetch draft data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDraftData();
  }, [token]);
  console.log(` case: ${caseStatus}`);

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
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/idd/${token}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(getFormDataObject()),
        }
      );

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
    setFormLoading(true);
    const submissionData = new FormData();
    const textData = getFormDataObject();
    for (const key in textData) {
      submissionData.append(key, textData[key]);
    }
    if (drawingFile) {
      submissionData.append("drawingFile", drawingFile);
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/idd/${token}`,
        {
          method: "POST",
          body: submissionData,
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setCaseStatus("IDD Submitted"); // On success, update the status to lock the form

      // setIsSubmitted(true);
    } catch (error) {
      console.error("Submission failed:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setFormLoading(false);
    }
  };

  // --- NEW handler to update UI after review ---
  const handleReviewSubmit = (updatedDoc) => {
    setSharedDocuments((prevDocs) =>
      prevDocs.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <p>Loading disclosure...</p>
      </div>
    );
  }

  if (caseStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error: Invalid or expired link.</p>
      </div>
    );
  }

  // const isFormDisabled = caseStatus === "IDD Submitted";
  console.log(caseStatus);
  const isFormDisabled = caseStatus !== "Awaiting Client IDD";

  // if (isSubmitted) {
  //   return (
  //     <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
  //       <Card className="w-full max-w-3xl text-center">
  //         <CardHeader>
  //           <CardTitle className="text-3xl text-green-600">
  //             Thank You!
  //           </CardTitle>
  //         </CardHeader>
  //         <CardContent>
  //           <p className="text-lg">
  //             Your Invention Disclosure has been successfully submitted.
  //           </p>
  //           <p className="mt-2 text-gray-500">
  //             The patent firm has been notified and will be in contact with you
  //             shortly.
  //           </p>
  //         </CardContent>
  //       </Card>
  //     </div>
  //   );
  // }
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          {/* <CardTitle className="text-2xl">
            Invention Disclosure Document
          </CardTitle>
          <CardDescription>
            Your progress can be saved. Please submit when you are ready.
          </CardDescription> */}
          <CardTitle className="text-2xl">Invention Disclosure</CardTitle>
          {caseStatus === "Awaiting Client Approval" && (
            <CardDescription>
              The firm has shared documents for your final review.
            </CardDescription>
          )}
          {isFormDisabled && (
            <CardDescription>
              Your submission has been received and is under review.
            </CardDescription>
          )}
          {caseStatus === "Awaiting Client IDD" && (
            <CardDescription>
              Please provide as much detail as possible.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {/* --- NEW SECTION: Documents for Review --- */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold border-b pb-2 mb-3">
              Documents for Your Review
            </h3>
            {/* <ClientReviewSection
              token={token}
              sharedDocuments={sharedDocuments}
              onReviewSubmit={handleReviewSubmit}
            /> */}
          </div>

          {/* --- NEW UI SECTION to display comments --- */}
          {/* {firmComments && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Changes Requested by the Firm</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">
                {firmComments}
              </AlertDescription>
            </Alert>
          )} */}

          {caseStatus === "Awaiting Client Approval" ? (
            <ClientReviewSection
              token={token}
              sharedDocuments={sharedDocuments}
              onReviewSubmit={handleReviewSubmit}
            />
          ) : (
            <>
              {isFormDisabled && (
                <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                  <AlertTitle className="text-green-800 dark:text-green-200">
                    Submission Received
                  </AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    Thank you. The firm will contact you if changes are needed.
                  </AlertDescription>
                </Alert>
              )}
              {firmComments && !isFormDisabled && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTitle>Changes Requested by the Firm</AlertTitle>
                  <AlertDescription className="whitespace-pre-wrap">
                    {firmComments}
                  </AlertDescription>
                </Alert>
              )}
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
                    disabled={isFormDisabled}
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
                    disabled={isFormDisabled}
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
                    disabled={isFormDisabled}
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
                    disabled={isFormDisabled}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="drawing-file"
                    className="text-lg font-semibold"
                  >
                    Drawings/Sketches
                  </Label>
                  <p className="text-sm text-gray-500">
                    Upload any relevant drawings, sketches, or diagrams (e.g.,
                    PDF, JPG, PNG).
                  </p>
                  <Input
                    id="drawing-file"
                    type="file"
                    onChange={(e) => setDrawingFile(e.target.files[0])}
                    disabled={isFormDisabled}
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
                    disabled={isFormDisabled}
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
                    disabled={isFormDisabled}
                    className="mt-2"
                  />
                </div>
              </form>
            </>
          )}
        </CardContent>
        {/* <CardFooter className="flex justify-between items-center pt-6"> */}
        {/* <div>
            <h3 className="text-lg font-semibold">Communication Log</h3>
            <ClientCommunicationLog token={token} initialMessages={messages} />
            {console.log("hie dawg" + messages)}
          </div> */}

        {/* <div className="text-sm text-green-600 font-medium">{saveStatus}</div>
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
          </div> */}
        {/* </CardFooter> */}

        {caseStatus !== "Awaiting Client Approval" && (
          <CardFooter className="flex justify-between items-center pt-6">
            <div className="text-sm text-green-600 font-medium">
              {saveStatus}
            </div>
            <div className="flex">
              <Button
                type="button"
                variant="outline"
                className="mr-4"
                onClick={handleSaveDraft}
                disabled={isFormDisabled || formLoading}
              >
                Save Draft
              </Button>
              <Button
                type="submit"
                form="idd-form"
                disabled={isFormDisabled || formLoading}
              >
                {formLoading ? "Submitting..." : "Submit Disclosure"}
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default ClientIddForm;
