// src/pages/CaseView.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCaseDetails();
  }, [caseId, session]);

  if (isLoading) return <div className="p-8">Loading case details...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!caseDetails) return <div className="p-8">Case not found.</div>;

  const disclosureData = caseDetails.invention_disclosure?.data || {};

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
