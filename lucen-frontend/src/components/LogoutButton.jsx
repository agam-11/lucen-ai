// The new, improved LogoutButton.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth"; // Import our hook
import { Button } from "./ui/button";

function LogoutButton() {
  const { signOut } = useAuth(); // Get the signOut function from our context
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      // The onAuthStateChange listener in AuthProvider will handle redirecting,
      // but we can also navigate immediately for a faster user experience.
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Add a variant to the button so it looks good in the header
  return (
    <Button onClick={handleLogout} variant="outline">
      Logout
    </Button>
  );
}

export default LogoutButton;
