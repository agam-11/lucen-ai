// lucen-frontend/src/pages/Register.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // For redirection after registration
// Assuming you're using shadcn/ui, import its components:
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
import { useAuth } from "../hooks/useAuth"; // Or your actual path to the hook

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp } = useAuth(); // Get user, loading state, and signUp from context

  // This useEffect handles redirecting if the user is already logged in
  useEffect(() => {
    // console.log("Register.jsx useEffect - authLoading:", authLoading, "user:", !!user);
    if (!authLoading && user) {
      // console.log("Register.jsx: User is already authenticated, redirecting to dashboard.");
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]); // Dependencies: re-run if user, authLoading, or navigate changes

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage("");
    setLoading(true);

    try {
      const { data, error: signUpError } = await signUp({
        email: email,
        password: password,
        // You can add options here, like redirect URLs or metadata
        // options: {
        //   data: {
        //     full_name: 'Demo User', // Example metadata
        //   }
        // }
      });

      if (signUpError) {
        throw signUpError;
      }

      // Check if user object exists and if email confirmation is required
      if (
        data.user &&
        data.user.identities &&
        data.user.identities.length === 0
      ) {
        // This case can happen if email confirmation is enabled and the user already exists but is unconfirmed.
        // Or if there's some other issue where the user object is present but identities are empty.
        setMessage(
          "Registration successful, but please check your email for a confirmation link if required by the system, or try logging in if you have already confirmed."
        );
      } else if (data.user) {
        setMessage(
          "Registration successful! Please check your email for a confirmation link if required."
        );
        // You might want to redirect to login or a specific page
        navigate("/login");
      } else {
        // Fallback if user object is null but no error, which is unusual for signUp
        setMessage(
          "Registration attempted. Please check your email or try logging in."
        );
      }
    } catch (err) {
      console.error("Error during registration:", err);
      setError(
        err.message || "An unexpected error occurred during registration."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className={"w-full max-w-lg"}>
        {/* Replace with shadcn/ui Card or similar for styling */}
        <CardHeader>
          <CardTitle>Register Firm User</CardTitle>
          <CardDescription>
            Enter your details below to register your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                {/* <Label htmlFor="email">Email</Label> */}
                <Label htmlFor="email">Email:</Label>
                <Input // Replace with shadcn/ui Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3">
                {/* <Label htmlFor="password">Password</Label> */}
                <Label htmlFor="password">Password:</Label>
                <Input // Replace with shadcn/ui Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="6" // Supabase default minimum password length
                />
              </div>
              <Button type="submit" disabled={loading} className={"w-full"}>
                {" "}
                {/* Replace with shadcn/ui Button */}
                {loading ? "Registering..." : "Register"}
              </Button>
            </div>
          </form>
          {error && <p style={{ color: "red" }}>Error: {error}</p>}
          {message && <p style={{ color: "green" }}>{message}</p>}
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <a href="/login" className="underline underline-offset-4">
              Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Register;
