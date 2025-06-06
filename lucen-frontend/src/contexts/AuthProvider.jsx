// src/contexts/AuthProvider.jsx (previously AuthContext.jsx)
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient"; // Make sure this path is correct
import { AuthContext } from "./authContextObject"; // Import AuthContext from the new file

// This file now only exports the AuthProvider component.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // console.log("AuthProvider useEffect: Attempting to get session. Supabase client:", supabase); // Keep console logs for debugging

    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        // console.log("AuthProvider useEffect: getSession response", currentSession);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error(
          "AuthProvider useEffect: Error in getSession promise:",
          error
        );
        setLoading(false);
      });

    const {
      data: { subscription },
      error: listenerError,
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      // console.log("AuthProvider onAuthStateChange: newSession", newSession);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    if (listenerError) {
      console.error(
        "AuthProvider useEffect: Error setting up onAuthStateChange listener:",
        listenerError
      );
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
        // console.log("AuthProvider: Unsubscribed from auth state changes.");
      }
    };
  }, []);

  const value = {
    signUp: (data) => supabase.auth.signUp(data),
    signIn: (data) => supabase.auth.signInWithPassword(data),
    signOut: () => supabase.auth.signOut(),
    user,
    session,
    loading,
  };

  return (
    // Use the imported AuthContext here
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
