// lucen-backend/config/supabaseClient.js
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config(); // Make sure environment variables from .env are loaded

const supabaseProjectUrl = process.env.SUPABASE_PROJECT_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if the variables are loaded correctly
if (!supabaseProjectUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Supabase URL or Service Role Key is missing. Check your .env file in the backend directory."
  );
}

// Create the Supabase client for the backend
// This client uses the service_role key and can bypass Row Level Security.
const supabaseAdmin = createClient(supabaseProjectUrl, supabaseServiceRoleKey);

// Export the client so you can use it in other parts of your backend
module.exports = supabaseAdmin;
