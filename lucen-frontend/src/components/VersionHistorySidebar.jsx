// src/components/VersionHistorySidebar.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Clock } from "lucide-react";

function VersionHistorySidebar({ caseId, onSelectVersion, currentContent }) {
  const { session } = useAuth();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!session || !caseId) return;
      setIsLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/drafts/${caseId}/history`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch history.");
        const data = await response.json();
        setHistory(data || []);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [caseId, session]);

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Version History</h3>
      {isLoading ? (
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto pr-2 space-y-2">
          {history.length > 0 ? (
            history.map((version) => (
              <div
                key={version.id}
                className="p-2 rounded-md hover:bg-muted cursor-pointer"
                onClick={() => onSelectVersion(version.id)}
              >
                {version.is_milestone ? (
                  <p className="font-semibold text-primary flex items-center">
                    <Star className="h-4 w-4 mr-2 text-yellow-500" />
                    {version.version_name}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Auto-saved version
                  </p>
                )}
                <p className="text-xs text-muted-foreground ml-6">
                  {new Date(version.created_at).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              No history found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default VersionHistorySidebar;
