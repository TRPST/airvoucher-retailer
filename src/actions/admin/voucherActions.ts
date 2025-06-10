import { createClient } from "@/utils/supabase/client";
import { VoucherInventory, ResponseType } from "../types/adminTypes";

/**
 * Fetch a single voucher type by ID
 */
export async function fetchVoucherType(
  id: string
): Promise<ResponseType<{ id: string; name: string; supplier_commission_pct: number }>> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("voucher_types")
    .select("id, name, supplier_commission_pct")
    .eq("id", id)
    .single();

  return { data, error };
}

/**
 * Update the supplier commission percentage for a voucher type
 */
export async function updateSupplierCommission(
  id: string,
  supplierCommissionPct: number
): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("voucher_types")
    .update({ supplier_commission_pct: supplierCommissionPct })
    .eq("id", id)
    .select("id")
    .single();

  return { data, error };
}

export type VoucherTypeSummary = {
  id: string;
  name: string;
  totalVouchers: number;
  availableVouchers: number;
  soldVouchers: number;
  disabledVouchers: number;
  uniqueAmounts: number[];
  totalValue: number;
  icon?: string;
  supplierCommissionPct?: number;
};

/**
 * Fetch voucher inventory with voucher type names
 * @param typeId Optional parameter to filter vouchers by type ID
 */
export async function fetchVoucherInventory(
  typeId?: string
): Promise<ResponseType<VoucherInventory[]>> {
  const supabase = createClient();
  
  // First, get all voucher types to use as a lookup table
  const { data: voucherTypes, error: typesError } = await supabase
    .from("voucher_types")
    .select("id, name");

  if (typesError) {
    return { data: null, error: typesError };
  }

  console.log("Voucher types from database:", voucherTypes);

  // Create a lookup map for voucher type names by ID
  const typeNameMap = new Map<string, string>();
  voucherTypes.forEach((type: { id: string; name: string }) => {
    typeNameMap.set(type.id, type.name);
  });
  
  console.log("Voucher type mapping:", Object.fromEntries(typeNameMap.entries()));

  // Now get all voucher inventory using pagination to overcome Supabase's default 1000 row limit
  let allData: any[] = [];
  let hasMore = true;
  let page = 0;
  const pageSize = 1000;
  
  while (hasMore) {
    // Build query with optional type filter
    let query = supabase
      .from("voucher_inventory")
      .select("*");
    
    // Apply type filter if provided
    if (typeId) {
      query = query.eq('voucher_type_id', typeId);
    }
    
    // Apply pagination
    const { data: pageData, error: pageError } = await query
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (pageError) {
      return { data: null, error: pageError };
    }
    
    if (pageData.length > 0) {
      allData = [...allData, ...pageData];
      page++;
      console.log(`Fetched page ${page} with ${pageData.length} records. Total records: ${allData.length}`);
    } else {
      hasMore = false;
    }
    
    // Safety check to prevent infinite loops
    if (page > 20) {
      console.warn("Stopped pagination after 20 pages to prevent infinite loops");
      hasMore = false;
    }
  }
  
  const data = allData;

  if (data.length === 0) {
    return { 
      data: null, 
      error: new Error("No voucher inventory data found") 
    };
  }

  // Log the unique voucher type IDs in the inventory
  const uniqueTypeIds = [...new Set(data.map(v => v.voucher_type_id))];
  console.log("Unique voucher type IDs in inventory:", uniqueTypeIds);
  
  // Check for any vouchers with type IDs not in our mapping
  const unmappedTypeIds = uniqueTypeIds.filter(id => !typeNameMap.has(id));
  if (unmappedTypeIds.length > 0) {
    console.warn("Found vouchers with unmapped type IDs:", unmappedTypeIds);
  }
  
  // Log high-value vouchers directly from the database
  const highValueVouchers = data.filter(v => v.amount >= 100);
  console.log(`Found ${highValueVouchers.length} high-value vouchers (≥ R100) in database:`, 
    highValueVouchers.map(v => ({ 
      id: v.id, 
      amount: v.amount, 
      type_id: v.voucher_type_id,
      type_name: typeNameMap.get(v.voucher_type_id) || "UNKNOWN" 
    }))
  );

  // Transform the data to match the VoucherInventory type, using the lookup table
  const inventory = data.map((voucher) => ({
    id: voucher.id,
    amount: voucher.amount,
    pin: voucher.pin,
    serial_number: voucher.serial_number,
    expiry_date: voucher.expiry_date,
    status: voucher.status as "available" | "sold" | "disabled",
    voucher_type_name: typeNameMap.get(voucher.voucher_type_id) || "",
  }));

  // Log high-value vouchers after transformation
  const highValueInventory = inventory.filter(v => v.amount >= 100);
  console.log(`Found ${highValueInventory.length} high-value vouchers after transformation:`);
  
  return { data: inventory, error: null };
}

/**
 * Upload multiple vouchers to the inventory
 */
export async function uploadVouchers(
  vouchers: Array<{
    voucher_type_id: string;
    amount: number;
    pin: string;
    serial_number?: string;
    expiry_date?: string;
  }>
): Promise<ResponseType<{ count: number }>> {
  const supabase = createClient();
  
  const { data, error } = await supabase.from("voucher_inventory").insert(
    vouchers.map((v) => ({
      ...v,
      status: "available",
    }))
  );

  if (error) {
    return { data: null, error };
  }

  return { data: { count: vouchers.length }, error: null };
}

/**
 * Disable a voucher in the inventory
 */
export async function disableVoucher(
  id: string
): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("voucher_inventory")
    .update({ status: "disabled" })
    .eq("id", id)
    .select("id")
    .single();

  return { data, error };
}

/**
 * Fetch voucher type summaries for the main page
 */
export async function fetchVoucherTypeSummaries(): Promise<
  ResponseType<VoucherTypeSummary[]>
> {
  const supabase = createClient();
  
  try {
    console.log("Starting fetchVoucherTypeSummaries");
    
    // Get all voucher types with supplier commission percentage
    const { data: voucherTypes, error: typesError } = await supabase
      .from("voucher_types")
      .select("id, name, supplier_commission_pct");

    if (typesError) {
      console.error("Error fetching voucher types:", typesError);
      return { data: null, error: typesError };
    }

    console.log("Fetched voucher types:", voucherTypes);
    
    // Return empty array if no voucher types found
    if (!voucherTypes || voucherTypes.length === 0) {
      console.log("No voucher types found, returning empty array");
      return { data: [], error: null };
    }

    // Create default summaries with empty statistics
    const summaries: VoucherTypeSummary[] = voucherTypes.map((type: { id: string; name: string; supplier_commission_pct: number }) => {
      let icon = "credit-card";
      if (type.name.toLowerCase().includes("ringa")) {
        icon = "phone";
      } else if (type.name.toLowerCase().includes("hollywood")) {
        icon = "film";
      } else if (type.name.toLowerCase().includes("easyload")) {
        icon = "zap";
      }
      
      return {
        id: type.id,
        name: type.name,
        totalVouchers: 0,
        availableVouchers: 0,
        soldVouchers: 0,
        disabledVouchers: 0,
        uniqueAmounts: [],
        totalValue: 0,
        icon,
        supplierCommissionPct: type.supplier_commission_pct
      };
    });

    // Try to get voucher inventory, but don't fail if this fails
    try {
      console.log("Attempting to fetch voucher inventory");
      const { data: allVouchers, error: voucherError } = await fetchVoucherInventory();

      if (voucherError) {
        console.warn("Warning: Error fetching voucher inventory:", voucherError);
        // Continue with empty statistics
      } else if (allVouchers && allVouchers.length > 0) {
        console.log(`Successfully fetched ${allVouchers.length} vouchers`);
        
        // Update summaries with actual voucher data
        summaries.forEach(summary => {
          // Filter vouchers by this type
          const typeVouchers = allVouchers.filter(
            v => v.voucher_type_name.toLowerCase() === summary.name.toLowerCase()
          );

          if (typeVouchers.length > 0) {
            // Count by status
            summary.totalVouchers = typeVouchers.length;
            summary.availableVouchers = typeVouchers.filter(v => v.status === "available").length;
            summary.soldVouchers = typeVouchers.filter(v => v.status === "sold").length;
            summary.disabledVouchers = typeVouchers.filter(v => v.status === "disabled").length;

            // Get unique amounts
            summary.uniqueAmounts = [...new Set(typeVouchers.map(v => v.amount))].sort((a, b) => a - b);

            // Calculate total value of available vouchers
            summary.totalValue = typeVouchers
              .filter(v => v.status === "available")
              .reduce((sum, v) => sum + v.amount, 0);
          }
        });
      } else {
        console.log("No vouchers found in inventory");
      }
    } catch (inventoryError) {
      console.error("Error processing voucher inventory:", inventoryError);
      // Continue with empty statistics
    }

    console.log("Returning voucher type summaries:", summaries);
    return { data: summaries, error: null };
  } catch (error) {
    console.error("Unhandled error in fetchVoucherTypeSummaries:", error);
    return { 
      data: [], 
      error: error instanceof Error ? error : new Error("Failed to fetch voucher type summaries") 
    };
  }
}
