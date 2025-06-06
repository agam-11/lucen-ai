import "./App.css";
import { Button } from "./components/ui/button";
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth"; // Or your path
import { useNavigate, useLocation } from "react-router-dom";

function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If auth is done loading, we have a user, and they are on a public page (like root)
    // This is a basic example; you might want more sophisticated logic
    if (
      !loading &&
      user &&
      (location.pathname === "/" ||
        location.pathname === "/login" ||
        location.pathname === "/register")
    ) {
      console.log(
        "User authenticated, redirecting to dashboard from:",
        location.pathname
      );
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate, location.pathname]);

  return (
    <div>
      <Button>hell oniga</Button>
    </div>
  );
}

export default App;
