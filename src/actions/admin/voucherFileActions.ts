import { parseVoucherFile } from "@/utils/voucherFileParser";
import { fetchVoucherTypes } from "./commissionActions";
import { uploadVouchers } from "./voucherActions";
import { ResponseType } from "../types/adminTypes";
import { createClient } from "@/utils/supabase/client";

export type UploadResult = {
  totalLines: number;
  validVouchers: number;
  newVouchers: number;
  duplicateVouchers: number;
  errors: string[];
  voucherType: string;
  mode: "merge" | "replace";
};

/**
 * Process a voucher file and upload valid vouchers to the database
 */
export async function processVoucherFile(
  fileContent: string,
  mode: "merge" | "replace" = "merge",
  voucherTypeId?: string
): Promise<ResponseType<UploadResult>> {
  const supabase = createClient();
  
  try {
    // Get voucher types
    const { data: voucherTypes, error: typesError } = await fetchVoucherTypes();
    
    if (typesError || !voucherTypes) {
      return {
        data: null,
        error: new Error(`Failed to fetch voucher types: ${typesError?.message || "Unknown error"}`)
      };
    }
    
    // Parse the file
    const result = parseVoucherFile(fileContent, voucherTypes);
    
    if (result.vouchers.length === 0) {
      return {
        data: {
          totalLines: result.totalLines,
          validVouchers: 0,
          newVouchers: 0,
          duplicateVouchers: 0,
          errors: result.errors.length > 0 
            ? result.errors 
            : ["No valid vouchers found in the file"],
          voucherType: "",
          mode
        },
        error: null
      };
    }
    
    // Determine voucher type name based on the voucher_type_id of the first voucher
    const voucherType = voucherTypes.find(
      type => type.id === result.vouchers[0].voucher_type_id
    );

    // If we have a specific voucher type ID, validate that all vouchers match it
    if (voucherTypeId && result.vouchers.some(v => v.voucher_type_id !== voucherTypeId)) {
      return {
        data: null,
        error: new Error("File contains vouchers that don't match the expected voucher type")
      };
    }
    
    let newVouchers = 0;
    let duplicateVouchers = 0;
    
    if (mode === "replace") {
      // For replace mode, first delete all existing vouchers of this type
      const typeIdToReplace = voucherTypeId || result.vouchers[0].voucher_type_id;
      
      const { error: deleteError } = await supabase
        .from("voucher_inventory")
        .delete()
        .eq("voucher_type_id", typeIdToReplace);
      
      if (deleteError) {
        return {
          data: null,
          error: new Error(`Failed to delete existing vouchers: ${deleteError.message}`)
        };
      }
      
      // Now insert all vouchers
      const { error: uploadError } = await uploadVouchers(result.vouchers);
      
      if (uploadError) {
        return {
          data: null,
          error: new Error(`Failed to upload vouchers: ${uploadError.message}`)
        };
      }
      
      newVouchers = result.vouchers.length;
      duplicateVouchers = 0;
    } else {
      // For merge mode, check for duplicates and only insert new ones
      const pins = result.vouchers.map(v => v.pin);
      
      // Get existing vouchers with matching PINs
      const { data: existingVouchers, error: existingError } = await supabase
        .from("voucher_inventory")
        .select("pin")
        .in("pin", pins);
      
      if (existingError) {
        return {
          data: null,
          error: new Error(`Failed to check for existing vouchers: ${existingError.message}`)
        };
      }
      
      const existingPins = new Set(existingVouchers?.map(v => v.pin) || []);
      const newVoucherData = result.vouchers.filter(v => !existingPins.has(v.pin));
      
      duplicateVouchers = result.vouchers.length - newVoucherData.length;
      
      if (newVoucherData.length > 0) {
        // Insert only new vouchers
        const { error: uploadError } = await uploadVouchers(newVoucherData);
        
        if (uploadError) {
          return {
            data: null,
            error: new Error(`Failed to upload vouchers: ${uploadError.message}`)
          };
        }
        
        newVouchers = newVoucherData.length;
      } else {
        newVouchers = 0;
      }
    }
    
    // Return success result
    return {
      data: {
        totalLines: result.totalLines,
        validVouchers: result.vouchers.length,
        newVouchers,
        duplicateVouchers,
        errors: result.errors,
        voucherType: voucherType?.name || "Unknown",
        mode
      },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error 
        ? error 
        : new Error("An unknown error occurred while processing the voucher file")
    };
  }
}
