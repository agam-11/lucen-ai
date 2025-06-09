// src/components/ManualPriorArtUploader.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

function ManualPriorArtUploader({ caseId, onUploadSuccess }) {
  const { session } = useAuth();
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("documentFile", file);
    formData.append("notes", notes);

    try {
      const response = await fetch(
        `http://localhost:3001/api/cases/${caseId}/manual-prior-art`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message);
      }

      onUploadSuccess(result); // Pass the new document up to the parent

      // Reset form state after successful upload
      setFile(null);
      setNotes("");
      e.target.reset(); // This clears the file input field
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div>
        <Label htmlFor="manual-file-input">Document File</Label>
        <Input
          id="manual-file-input"
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>
      <div>
        <Label htmlFor="manual-notes">Notes (Optional)</Label>
        <Textarea
          id="manual-notes"
          placeholder="e.g., This document discloses the grinding blade mechanism."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={isUploading}>
          {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isUploading ? "Uploading..." : "Upload Document"}
        </Button>
      </div>
    </form>
  );
}

export default ManualPriorArtUploader;
