// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // <-- 1. IMPORT LINK
import { useAuth } from "../hooks/useAuth"; // We need the session for our API call
import { Button } from "@/components/ui/button";
import CreateCaseForm from "../components/CreateCaseForm"; // Import the new form component
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// You can use a utility function like this, or just put the logic in the useEffect
async function fetchCases(session) {
  const response = await fetch("http://localhost:3001/api/cases", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch cases");
  }
  return response.json();
}

function Dashboard() {
  const { session } = useAuth();
  const [cases, setCases] = useState([]); // State to hold the list of cases
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false); // State to control the dialog

  useEffect(() => {
    if (session) {
      // Only fetch if the user session exists
      setIsLoading(true);
      fetchCases(session)
        .then((data) => {
          setCases(data);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setIsLoading(false);
        });
    }
  }, [session]); // Re-run this effect if the session changes

  // This function will be called by our form when a case is successfully created
  const handleCaseCreated = (newCase) => {
    // Add the new case to the top of our existing cases list
    setCases((prevCases) => [newCase, ...prevCases]);
  };

  // Render different UI based on the state
  const renderContent = () => {
    if (isLoading) {
      return <p>Loading cases...</p>;
    }
    if (error) {
      return <p style={{ color: "red" }}>Error: {error}</p>;
    }
    if (cases.length === 0) {
      return <p>No cases found. Create your first one!</p>;
    }
    // If we have cases, display them
    return (
      <ul>
        {cases.map((caseItem) => (
          <li key={caseItem.id}>
            <Link
              to={`/case/${caseItem.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <strong>Client:</strong> {caseItem.client_name} -
              <i> Title: {caseItem.invention_title_snippet || "No Title"}</i>
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <h1>Dashboard</h1>

      {/* This Dialog will control the modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button>+ Create New Case</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Patent Case</DialogTitle>
            <DialogDescription>
              Enter the initial details for the new case. A secure link will be
              generated for the client.
            </DialogDescription>
          </DialogHeader>
          <CreateCaseForm
            onCaseCreated={handleCaseCreated}
            setOpen={setIsDialogOpen}
          />
        </DialogContent>
      </Dialog>

      <hr style={{ margin: "20px 0" }} />
      <h2>My Cases</h2>
      {renderContent()}
    </div>
  );
}

export default Dashboard;
