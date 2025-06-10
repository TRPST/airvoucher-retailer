import { createClient } from "@/utils/supabase/client";
import { Terminal, ResponseType } from "../types/adminTypes";

/**
 * Fetch terminals for a specific retailer
 */
export async function fetchTerminals(
  retailerId: string
): Promise<ResponseType<Terminal[]>> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("terminals")
    .select(
      `
      id,
      name,
      last_active,
      status
    `
    )
    .eq("retailer_id", retailerId);

  if (error) {
    return { data: null, error };
  }

  // Transform the data to match the Terminal type
  const terminals = data.map((terminal) => ({
    id: terminal.id,
    name: terminal.name,
    last_active: terminal.last_active,
    status: terminal.status as "active" | "inactive",
    auth_user_id: "", // No longer in the database
    email: "", // Email not available in the current query
  }));

  return { data: terminals, error: null };
}

/**
 * Create a new terminal for a retailer
 */
export async function createTerminal(
  retailerId: string,
  name: string
): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();
  
  // Create the terminal for the retailer
  const { data: terminal, error: terminalError } = await supabase
    .from("terminals")
    .insert({
      retailer_id: retailerId,
      name,
      status: "active",
    })
    .select("id")
    .single();

  if (terminalError) {
    return { data: null, error: terminalError };
  }

  return { data: terminal, error: null };
}
