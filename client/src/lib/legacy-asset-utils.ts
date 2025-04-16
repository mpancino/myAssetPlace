/**
 * Utilities for dealing with the legacy mortgage fields during the migration to the new mortgage model
 * This file should be removed once the migration is complete
 */
import { Asset, AssetWithLegacyMortgage } from "@shared/schema";

/**
 * Cast an Asset to an AssetWithLegacyMortgage to support legacy mortgage fields
 * This is used during the migration period as we're transitioning to using the mortgages table
 */
export function asLegacyAsset(asset: Asset | undefined): AssetWithLegacyMortgage | undefined {
  return asset as AssetWithLegacyMortgage;
}

/**
 * Type guard to check if an asset has legacy mortgage data
 */
export function hasLegacyMortgageData(asset: AssetWithLegacyMortgage | undefined): boolean {
  if (!asset) return false;
  
  return !!asset.hasMortgage && 
    (!!asset.mortgageAmount || 
     !!asset.mortgageLender || 
     !!asset.mortgageInterestRate);
}

/**
 * Check if an asset can support both legacy mortgage data and modern mortgage relationships
 */
export function isHybridMortgageAsset(asset: AssetWithLegacyMortgage | undefined): boolean {
  if (!asset) return false;
  
  // If it has both legacy data and a linked mortgage, it's a hybrid asset
  return hasLegacyMortgageData(asset) && !!asset.linkedMortgageId;
}

/**
 * Calculate a simple descriptive status for mortgage data state
 */
export function getMortgageDataStatus(asset: AssetWithLegacyMortgage | undefined): 'none' | 'legacy' | 'modern' | 'hybrid' {
  if (!asset) return 'none';
  
  const hasLegacy = hasLegacyMortgageData(asset);
  const hasModern = !!asset.linkedMortgageId;
  
  if (hasLegacy && hasModern) return 'hybrid';
  if (hasLegacy) return 'legacy';
  if (hasModern) return 'modern';
  return 'none';
}