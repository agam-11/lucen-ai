// src/hooks/useAuth.js
import { useContext } from "react";
import { AuthContext } from "../contexts/authContextObject"; // Import AuthContext from the new file

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined || context === null) {
    throw new Error(
      "useAuth must be used within an AuthProvider. Make sure AuthProvider wraps the component tree."
    );
  }
  return context;
}
