// src/pages/CaseView.jsx
import React, { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { FileText, Lightbulb, FileUp, PenSquare } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const sidebarLinks = [
  { name: "Invention Disclosure", href: "disclosure", icon: FileText },
  { name: "Prior Art Investigation", href: "investigation", icon: Lightbulb },
  { name: "Drafting Studio", href: "drafting", icon: PenSquare },
  { name: "Documents", href: "documents", icon: FileUp },
];

function CaseView() {
  const { caseId } = useParams();
  const { session } = useAuth();
  const [caseDetails, setCaseDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copyButtonText, setCopyButtonText] = useState("Copy Client Link");

  const fetchCaseDetails = useCallback(async () => {
    if (!session) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/cases/${caseId}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch case details");
      }
      const data = await response.json();
      setCaseDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [caseId, session]);

  useEffect(() => {
    fetchCaseDetails();
  }, [fetchCaseDetails]);

  // This is a helper for NavLink to style the active link
  const getNavLinkClass = ({ isActive }) => {
    return isActive
      ? "flex items-center p-2 rounded-md bg-muted text-foreground"
      : "flex items-center p-2 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground";
  };

  const handleCopyLink = (linkToCopy) => {
    navigator.clipboard.writeText(linkToCopy).then(() => {
      setCopyButtonText("Copied!");
      setTimeout(() => setCopyButtonText("Copy Client Link"), 2000);
    });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="w-68 h-full border-r p-4 flex flex-col justify-between">
        {/* Top part with navigation */}
        <div>
          <Link to="/dashboard">
            <h1 className="text-2xl font-bold px-2 mb-4">Lucen AI</h1>
          </Link>

          <nav className="flex flex-col space-y-2">
            {sidebarLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.href}
                className={getNavLinkClass}
              >
                <link.icon className="mr-3 h-5 w-5" />
                <span>{link.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* --- THIS IS THE NEW BOTTOM PART --- */}
        {/* It will only render after the case details have loaded */}
        {caseDetails && (
          <div className="p-2 border-t space-y-3">
            <p className="text-md font-semibold text-foreground">
              {caseDetails.client_name}
            </p>
            <p className="text-sm text-muted-foreground -mt-3">
              {caseDetails.client_email}
            </p>
            <div>
              <Badge
                variant={
                  caseDetails.status.includes("Approved")
                    ? "default"
                    : caseDetails.status.includes("Changes Requested by Client")
                    ? "destructive"
                    : caseDetails.status === "Pending Client Edits"
                    ? "warning"
                    : "secondary"
                }
              >
                {caseDetails.status}
              </Badge>
            </div>
            <div className="pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleCopyLink(
                    `${window.location.origin}/idd/${caseDetails.idd_secure_link_token}`
                  )
                }
              >
                {copyButtonText}
              </Button>
            </div>
          </div>
        )}

        {/* --- END OF NEW PART --- */}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {isLoading ? (
          <p>Loading case data...</p>
        ) : (
          <Outlet context={{ caseDetails, fetchCaseDetails }} />
        )}
      </main>
    </div>
  );
}

export default CaseView;
