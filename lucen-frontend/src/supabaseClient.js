// lucen-frontend/src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_PROJECT_URL; // Replace with your actual Supabase Project URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // Replace with your actual Supabase anon (public) key

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL and Anon Key are required. Check your .env file or configuration."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
