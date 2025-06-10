import { createClient } from "@/utils/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

export type AgentRetailer = {
  id: string;
  name: string;
  status: "active" | "suspended" | "inactive";
  balance: number;
  commission_balance: number;
  location?: string;
  sales_count?: number;
  commission_earned?: number;
};

export type AgentStatement = {
  id: string;
  created_at: string;
  type: string;
  amount: number;
  balance_after: number;
  retailer_name?: string;
  notes?: string;
};

/**
 * Fetch retailers assigned to an agent
 */
export async function fetchMyRetailers(agentId: string): Promise<{
  data: AgentRetailer[] | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    console.log("Fetching retailers for agent ID:", agentId);

    const { data, error } = await supabase
      .from("retailers")
      .select(
        `
        id,
        name,
        status,
        balance,
        commission_balance,
        location
      `
      )
      .eq("agent_profile_id", agentId);

    if (error) {
      console.error("Supabase error when fetching agent retailers:", error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      console.log("No retailers found for agent:", agentId);

      // In development, return mock data for testing
      if (process.env.NODE_ENV === "development") {
        console.log("Creating mock data for development");
        return {
          data: [
            {
              id: "mock-retailer-1",
              name: "Dev Test Retailer",
              status: "active",
              balance: 1000,
              commission_balance: 150,
              location: "Test Location",
              sales_count: 5,
              commission_earned: 75,
            },
          ],
          error: null,
        };
      }

      return { data: [], error: null };
    }

    console.log(`Found ${data.length} retailers for agent ${agentId}`);

    // For each retailer, we'll add their monthly sales count and commission
    const result: AgentRetailer[] = [];
    const now = new Date();
    const firstDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).toISOString();

    for (const retailer of data) {
      try {
        // Get sales for this retailer in the current month
        const { data: salesData, error: salesError } = await supabase
          .from("sales")
          .select(
            `
            id,
            agent_commission,
            terminals!inner(retailer_id)
          `
          )
          .eq("terminals.retailer_id", retailer.id)
          .gte("created_at", firstDayOfMonth);

        if (salesError) {
          console.warn(
            `Error fetching sales for retailer ${retailer.id}:`,
            salesError
          );
        }

        result.push({
          ...retailer,
          sales_count: salesData?.length || 0,
          commission_earned:
            salesData?.reduce(
              (sum, sale) => sum + (sale.agent_commission || 0),
              0
            ) || 0,
        });
      } catch (err) {
        console.error(`Error processing retailer ${retailer.id}:`, err);
        // Still add the retailer without sales data
        result.push({
          ...retailer,
          sales_count: 0,
          commission_earned: 0,
        });
      }
    }

    return { data: result, error: null };
  } catch (err) {
    console.error("Unexpected error in fetchMyRetailers:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch agent statements (transactions) with optional date filtering
 */
export async function fetchAgentStatements(
  agentId: string,
  { startDate, endDate }: { startDate?: string; endDate?: string }
): Promise<{
  data: AgentStatement[] | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    console.log(
      `Fetching statements for agent ${agentId} from ${startDate || "all"} to ${
        endDate || "now"
      }`
    );

    let query = supabase
      .from("transactions")
      .select(
        `
        id,
        created_at,
        type,
        amount,
        balance_after,
        notes,
        retailers(name)
      `
      )
      .eq("agent_profile_id", agentId);

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // Order by newest first
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching agent statements:", error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      console.log("No statements found for agent:", agentId);

      // In development, return mock data for testing
      if (process.env.NODE_ENV === "development") {
        console.log("Creating mock statement data for development");
        const mockDate = new Date().toISOString();
        return {
          data: [
            {
              id: "mock-statement-1",
              created_at: mockDate,
              type: "commission_credit",
              amount: 50,
              balance_after: 150,
              retailer_name: "Dev Test Retailer",
              notes: "Commission from voucher sale",
            },
            {
              id: "mock-statement-2",
              created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
              type: "commission_payout",
              amount: -100,
              balance_after: 100,
              notes: "Monthly commission payout",
            },
          ],
          error: null,
        };
      }

      return { data: [], error: null };
    }

    console.log(`Found ${data.length} statements for agent ${agentId}`);

    // Transform the data to match the AgentStatement type
    const statements = data.map((statement) => ({
      id: statement.id,
      created_at: statement.created_at,
      type: statement.type,
      amount: statement.amount,
      balance_after: statement.balance_after,
      retailer_name: statement.retailers?.[0]?.name,
      notes: statement.notes,
    }));

    return { data: statements, error: null };
  } catch (err) {
    console.error("Unexpected error in fetchAgentStatements:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch a summary of an agent's performance
 */
export async function fetchAgentSummary(agentId: string): Promise<{
  data: {
    retailer_count: number;
    mtd_sales: number;
    mtd_commission: number;
    ytd_commission: number;
  } | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    console.log("Fetching performance summary for agent:", agentId);

    // In development, return mock data for testing
    if (process.env.NODE_ENV === "development") {
      console.log("Returning mock summary data for development");
      return {
        data: {
          retailer_count: 3,
          mtd_sales: 12,
          mtd_commission: 240,
          ytd_commission: 1250,
        },
        error: null,
      };
    }

    // Get count of retailers assigned to this agent
    const { data: retailers, error: retailersError } = await supabase
      .from("retailers")
      .select("id", { count: "exact" })
      .eq("agent_profile_id", agentId);

    if (retailersError) {
      console.error("Error counting retailers:", retailersError);
      return { data: null, error: retailersError };
    }

    // Get current date ranges
    const now = new Date();
    const firstDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).toISOString();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    // Get MTD sales and commissions
    const { data: mtdData, error: mtdError } = await supabase
      .from("sales")
      .select(
        `
        id,
        sale_amount,
        agent_commission
      `
      )
      .eq("agent_profile_id", agentId)
      .gte("created_at", firstDayOfMonth);

    if (mtdError) {
      console.error("Error fetching MTD data:", mtdError);
      return { data: null, error: mtdError };
    }

    // Get YTD commissions
    const { data: ytdData, error: ytdError } = await supabase
      .from("sales")
      .select("agent_commission")
      .eq("agent_profile_id", agentId)
      .gte("created_at", firstDayOfYear);

    if (ytdError) {
      console.error("Error fetching YTD data:", ytdError);
      return { data: null, error: ytdError };
    }

    // Calculate summary metrics
    const mtd_sales = mtdData?.length || 0;
    const mtd_commission =
      mtdData?.reduce((sum, sale) => sum + (sale.agent_commission || 0), 0) ||
      0;
    const ytd_commission =
      ytdData?.reduce((sum, sale) => sum + (sale.agent_commission || 0), 0) ||
      0;

    const summary = {
      retailer_count: retailers?.length || 0,
      mtd_sales,
      mtd_commission,
      ytd_commission,
    };

    console.log("Agent summary:", summary);
    return { data: summary, error: null };
  } catch (err) {
    console.error("Unexpected error in fetchAgentSummary:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
