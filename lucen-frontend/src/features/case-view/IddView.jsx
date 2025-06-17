// src/features/case-view/IddView.jsx
import React from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import RequestChangesForm from "@/components/RequestChangesForm";

// We can define the DetailSection component here again for now to keep it self-contained
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

function IddView() {
  const { caseDetails, fetchCaseDetails } = useOutletContext();
  const disclosure = caseDetails?.invention_disclosure;
  const disclosureData = disclosure?.data || {};

  if (!disclosure) {
    return (
      <div className="text-center p-8 bg-card rounded-lg shadow-sm">
        <p className="text-muted-foreground">
          The client has not submitted their Invention Disclosure Document yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Invention Disclosure</h1>

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
              caseId={caseDetails.id}
              onRequestSent={fetchCaseDetails}
            />
          </CardContent>
        </Card>
      )}

      {disclosure.firm_comments && (
        <Alert variant="neutral" className="mb-6">
          <AlertTitle>Your Last Feedback to Client</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">
            {disclosure.firm_comments}
          </AlertDescription>
        </Alert>
      )}

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
    </div>
  );
}

export default IddView;
