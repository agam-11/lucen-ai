// src/components/ClientReviewSection.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

function ClientReviewSection({ token, sharedDocuments, onReviewSubmit }) {
  const [comments, setComments] = useState({}); // Stores comments for each doc
  const [isSubmitting, setIsSubmitting] = useState(null); // Tracks which doc is submitting

  const handleReview = async (docId, status) => {
    setIsSubmitting(docId);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/idd/${token}/documents/${docId}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, comments: comments[docId] || "" }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message);
      }
      onReviewSubmit(result); // Notify parent component of the update
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setIsSubmitting(null);
    }
  };

  if (!sharedDocuments || sharedDocuments.length === 0) {
    return null; // Don't show anything if there are no shared documents
  }

  return (
    <div className="space-y-4">
      {sharedDocuments.map((doc) => {
        const docId = doc.id;
        const isReviewComplete = ["approved", "changes_requested"].includes(
          doc.client_review_status
        );

        return (
          <div key={docId} className="p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <a
                href={doc.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 hover:underline"
              >
                {doc.file_name}
              </a>
              {doc.client_review_status === "approved" && (
                <Badge className="bg-green-100 text-green-800">Approved</Badge>
              )}
              {doc.client_review_status === "changes_requested" && (
                <Badge variant="destructive">Changes Requested</Badge>
              )}
            </div>
            {doc.notes && (
              <p className="text-sm text-muted-foreground mt-1">
                Firm Notes: {doc.notes}
              </p>
            )}

            {!isReviewComplete ? (
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor={`comments-${docId}`}>
                    Your Feedback (Optional)
                  </Label>
                  <Textarea
                    id={`comments-${docId}`}
                    placeholder="If you have any changes, please describe them here."
                    value={comments[docId] || ""}
                    onChange={(e) =>
                      setComments((prev) => ({
                        ...prev,
                        [docId]: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleReview(docId, "changes_requested")}
                    disabled={isSubmitting === docId}
                  >
                    {isSubmitting === docId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Request Changes"
                    )}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleReview(docId, "approved")}
                    disabled={isSubmitting === docId}
                  >
                    {isSubmitting === docId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Approve Document"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Alert className="mt-4">
                <AlertTitle>Review Submitted</AlertTitle>
                <AlertDescription>
                  {doc.client_review_status === "approved"
                    ? "You have approved this document."
                    : "You have requested changes for this document."}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
      })}
    </div>
  );
}
export default ClientReviewSection;
