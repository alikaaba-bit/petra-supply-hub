/**
 * Brand filter for DriveHQ SellerCloud data.
 *
 * Only 5 of 17 companies in SellerCloud belong to Petra Brands.
 * This module provides a whitelist filter + brand name normalization.
 */

const PETRA_BRANDS: Record<string, string> = {
  fomin: "Fomin",
  everymood: "EveryMood",
  "luna naturals": "Luna Naturals",
  "house of party": "House of Party",
  roofus: "Roofus",
};

/**
 * Check if a company name belongs to Petra Brands (case-insensitive).
 */
export function isPetraBrand(company: string): boolean {
  return PETRA_BRANDS[company.toLowerCase().trim()] !== undefined;
}

/**
 * Normalize a company name to its canonical Petra brand name.
 * Returns null if not a Petra brand.
 */
export function normalizeBrandName(company: string): string | null {
  return PETRA_BRANDS[company.toLowerCase().trim()] ?? null;
}
