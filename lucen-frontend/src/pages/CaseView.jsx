// src/pages/CaseView.jsx
import React from "react";
import { useParams } from "react-router-dom";

function CaseView() {
  // This hook from react-router-dom gets parameters from the URL
  const { caseId } = useParams();

  return (
    <div>
      <h1>Individual Case View</h1>
      <p>Details for Case ID: {caseId}</p>
      {/* Later, we will fetch and display all the case details here */}
    </div>
  );
}

export default CaseView;
