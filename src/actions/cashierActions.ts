import { createClient } from "@/utils/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

// Type definitions
export type CashierTerminalProfile = {
  terminal_id: string;
  terminal_name: string;
  retailer_id: string;
  retailer_name: string;
  retailer_balance: number;
  retailer_credit_limit: number;
  retailer_credit_used: number;
  retailer_commission_balance: number;
};

/**
 * Fetch cashier's terminal profile and associated retailer information
 * @param cashierId - The user ID of the cashier
 * @returns CashierTerminalProfile with terminal and retailer details
 */
export async function fetchCashierTerminal(cashierId: string) {
  const supabase = createClient();
  
  try {
    // First get the terminal associated with this cashier
    const { data: terminal, error: terminalError } = await supabase
      .from("terminals")
      .select(`
        id,
        name,
        retailer_id
      `)
      .eq("cashier_profile_id", cashierId)
      .single();

    if (terminalError) {
      return { data: null, error: terminalError };
    }

    if (!terminal) {
      return { data: null, error: { message: "No terminal found for this cashier" } };
    }

    // Now get the retailer information
    const { data: retailer, error: retailerError } = await supabase
      .from("retailers")
      .select(`
        id,
        name,
        balance,
        credit_limit,
        credit_used,
        commission_balance
      `)
      .eq("id", terminal.retailer_id)
      .single();

    if (retailerError) {
      return { data: null, error: retailerError };
    }

    if (!retailer) {
      return { data: null, error: { message: "Retailer not found for terminal" } };
    }

    // Combine the data
    const cashierProfile: CashierTerminalProfile = {
      terminal_id: terminal.id,
      terminal_name: terminal.name,
      retailer_id: retailer.id,
      retailer_name: retailer.name,
      retailer_balance: retailer.balance,
      retailer_credit_limit: retailer.credit_limit,
      retailer_credit_used: retailer.credit_used,
      retailer_commission_balance: retailer.commission_balance,
    };

    return { data: cashierProfile, error: null };
  } catch (error) {
    console.error("Error fetching cashier terminal:", error);
    return {
      data: null,
      error: {
        message: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Fetch sales history for a cashier's terminal
 * @param cashierId - The user ID of the cashier
 * @param startDate - Optional start date for filtering
 * @param endDate - Optional end date for filtering
 * @returns Array of sales transactions
 */
export async function fetchCashierSalesHistory(
  cashierId: string,
  startDate?: string,
  endDate?: string
) {
  const supabase = createClient();
  
  try {
    // First get the terminal ID for this cashier
    const { data: terminal, error: terminalError } = await supabase
      .from("terminals")
      .select("id")
      .eq("cashier_profile_id", cashierId)
      .single();

    if (terminalError || !terminal) {
      return { data: [], error: terminalError || { message: "Terminal not found" } };
    }

    // Build the query
    let query = supabase
      .from("sales")
      .select(`
        id,
        created_at,
        voucher_amount,
        sale_amount,
        retailer_commission,
        voucher_type,
        pin,
        serial_number,
        ref_number,
        terminals!inner(name)
      `)
      .eq("terminal_id", terminal.id)
      .order("created_at", { ascending: false });

    // Apply date filters if provided
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: sales, error: salesError } = await query;

    if (salesError) {
      return { data: [], error: salesError };
    }

    // Transform the data to include terminal name
    const transformedSales = sales?.map(sale => ({
      ...sale,
      terminal_name: (sale.terminals as any)?.name || "Unknown Terminal",
    })) || [];

    return { data: transformedSales, error: null };
  } catch (error) {
    console.error("Error fetching cashier sales history:", error);
    return {
      data: [],
      error: {
        message: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Fetch available voucher types for cashier (same as retailer)
 * This is a re-export for consistency
 */
export { fetchAvailableVoucherTypes } from "./retailerActions";

/**
 * Fetch voucher inventory by type for cashier (same as retailer)
 * This is a re-export for consistency
 */
export { fetchVoucherInventoryByType } from "./retailerActions";

/**
 * Fetch retailer commission data for cashier (same as retailer)
 * This is a re-export for consistency
 */
export { fetchRetailerCommissionData } from "./retailerActions";

/**
 * Sell voucher from cashier terminal (same as retailer)
 * This is a re-export for consistency
 */
export { sellVoucher } from "./retailerActions";

// Re-export types that cashier uses
export type { VoucherType } from "./retailerActions";
