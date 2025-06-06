// Example Logout Button
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    } else {
      navigate("/login"); // Redirect to login after logout
    }
  };

  return <Button onClick={handleLogout}>Logout</Button>;
}
export default LogoutButton;
