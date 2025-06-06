// lucen-frontend/src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
// import { useAuth } from '../contexts/AuthContext'; // If using an Auth context
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { signIn, user, loading: authLoading } = useAuth();

  // Check if user is already logged in
  useEffect(() => {
    // If auth isn't loading and a user object exists, they are already logged in.
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signIn({
        email: email,
        password: password,
      });
      signIn;

      if (signInError) {
        throw signInError;
      }

      if (data.session) {
        // console.log('Login successful, session:', data.session);
        // if (setSession) setSession(data.session); // Update auth context
        navigate("/dashboard"); // Redirect to dashboard or desired page
      } else {
        // This case should ideally not happen if signInError is not thrown
        setError("Login failed. Please check your credentials.");
      }
    } catch (err) {
      console.error("Error during login:", err);
      setError(err.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark">
      {" "}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Login to Lucen AI</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-6" onSubmit={handleLogin}>
            <div className="grid gap-3">
              <Label htmlFor="email">Email:</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="password">Password:</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
          {error && <p style={{ color: "red" }}>Error: {error}</p>}
          {/* Add link to Register page */}

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <a href="/register" className="underline underline-offset-4">
              Sign up
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
