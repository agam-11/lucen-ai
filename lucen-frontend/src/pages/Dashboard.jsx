// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import CreateCaseForm from "../components/CreateCaseForm";

// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Fetch cases function remains the same
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
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (session) {
      setIsLoading(true);
      fetchCases(session)
        .then((data) => {
          // Sort cases by creation date, newest first
          const sortedData = data.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          setCases(sortedData);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setIsLoading(false);
        });
    }
  }, [session]);

  const handleCaseCreated = async () => {
    // We don't need the 'newCase' object from the form anymore.
    // Instead, we will refetch the whole list to guarantee data consistency.
    console.log("A new case was created. Refetching the full list...");
    setIsLoading(true); // Show a loading indicator
    try {
      const data = await fetchCases(session);
      const sortedData = data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setCases(sortedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: A much nicer looking way to render the cases ---
  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center p-8">Loading cases...</div>;
    }
    if (error) {
      return <div className="text-center p-8 text-red-500">Error: {error}</div>;
    }
    if (cases.length === 0) {
      return (
        <div className="text-center p-8 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-semibold">No cases found</h3>
          <p className="text-sm text-muted-foreground">
            Click "+ Create New Case" to get started.
          </p>
        </div>
      );
    }
    // Display cases in a professional-looking table
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client Name</TableHead>
            <TableHead>Invention Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseItem) => (
            <TableRow
              key={caseItem.id}
              onClick={() => navigate(`/case/${caseItem.id}`)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-medium">
                {caseItem.client_name}
              </TableCell>
              <TableCell>
                {caseItem.invention_title_snippet || "No Title"}
              </TableCell>
              <TableCell>
                {/* <Badge variant="outline">{caseItem.status}</Badge> */}
                <Badge
                  variant={
                    caseItem.status.includes("Approved")
                      ? "default"
                      : caseItem.status.includes("Changes Requested")
                      ? "destructive"
                      : "outline"
                  }
                >
                  {caseItem.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {new Date(caseItem.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>+ Create New Case</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Patent Case</DialogTitle>
              <DialogDescription>
                Enter the initial details for the new case. A secure link will
                be generated for the client.
              </DialogDescription>
            </DialogHeader>
            <CreateCaseForm
              onCaseCreated={handleCaseCreated}
              setOpen={setIsDialogOpen}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Cases</CardTitle>
          <CardDescription>
            A list of all your active patent cases. Click a row to view details.
          </CardDescription>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
