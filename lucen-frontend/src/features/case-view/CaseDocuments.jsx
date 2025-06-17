// src/features/case-view/CaseDocuments.jsx
import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import ManualPriorArtUploader from "../../components/ManualPriorArtUploader"; // We'll move the component logic here too
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

function CaseDocuments() {
  // Get caseDetails and the refetch function from the parent layout
  const { caseDetails, fetchCaseDetails } = useOutletContext();
  const { session } = useAuth();

  // All state related to this feature now lives here
  const [sharingDocId, setSharingDocId] = useState(null);

  const handleUploadOrShareSuccess = () => {
    // Simply call the refetch function from the parent to ensure all data is up to date
    fetchCaseDetails();
  };

  const handleShareDocument = async (docId) => {
    setSharingDocId(docId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/documents/${docId}/share`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to share document.");
      }
      await new Promise((resolve) => setTimeout(resolve, 500)); // Artificial delay for UX
      handleUploadOrShareSuccess(); // Refetch data
    } catch (err) {
      console.error("Failed to share document:", err);
    } finally {
      setSharingDocId(null);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Case Documents</h1>

      <Card>
        <CardHeader>
          <CardTitle>Manually Add Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <ManualPriorArtUploader
            caseId={caseDetails?.id}
            onUploadSuccess={handleUploadOrShareSuccess}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Associated Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {caseDetails?.documents && caseDetails.documents.length > 0 ? (
            <ul className="space-y-4">
              {caseDetails.documents.map((doc) => (
                <li key={doc.id} className="p-3 rounded-md bg-muted/50">
                  <div className="flex justify-between items-center">
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
                        <p className="text-sm text-muted-foreground mt-1">
                          Notes: {doc.notes}
                        </p>
                      )}
                    </div>
                    {!doc.is_shared && (
                      <Button
                        onClick={() => handleShareDocument(doc.id)}
                        size="sm"
                        variant="outline"
                        disabled={sharingDocId === doc.id}
                      >
                        {sharingDocId === doc.id && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {sharingDocId === doc.id
                          ? "Sharing..."
                          : "Share with Client"}
                      </Button>
                    )}
                  </div>

                  {doc.is_shared && (
                    <div className="mt-3">
                      {doc.client_review_status === "pending" && (
                        <Badge variant="secondary">
                          Awaiting Client Review
                        </Badge>
                      )}
                      {doc.client_review_status === "approved" && (
                        <Badge className="bg-green-100 text-green-800">
                          Client Approved
                        </Badge>
                      )}
                      {doc.client_review_status === "changes_requested" && (
                        <Alert variant="destructive">
                          <AlertTitle>Client Requested Changes</AlertTitle>
                          <AlertDescription className="whitespace-pre-wrap mt-2">
                            {doc.client_comments ||
                              "No specific comments were provided."}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No documents have been uploaded for this case yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CaseDocuments;
