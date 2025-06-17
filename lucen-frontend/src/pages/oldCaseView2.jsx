// src/pages/CaseView.jsx
import React, { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { FileText, Lightbulb, FileUp, PenSquare } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="w-64 h-full border-r p-4 space-y-4">
        <h1 className="text-2xl font-bold px-2">Lucen AI</h1>
        <nav className="flex flex-col space-y-2">
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.name}
              to={`/case/${caseId}/${link.href}`}
              className={getNavLinkClass}
            >
              <link.icon className="mr-3 h-5 w-5" />
              <span>{link.name}</span>
            </NavLink>
          ))}
        </nav>
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
