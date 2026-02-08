import { differenceInDays } from "date-fns";

export type VelocityTier = "A" | "B" | "C" | "D" | "F" | "N";

export interface VelocityResult {
  tier: VelocityTier;
  weight: number;
  label: string;
}

const VELOCITY_MAP: Record<VelocityTier, { weight: number; label: string }> = {
  A: { weight: 1.0, label: "Fast Mover" },
  B: { weight: 0.85, label: "Steady" },
  C: { weight: 0.5, label: "Slow Mover" },
  D: { weight: 0.2, label: "Stale" },
  F: { weight: 0.05, label: "Dead Stock" },
  N: { weight: 0.7, label: "New" },
};

export function getVelocityTier(
  unitsSold30d: number,
  unitsSold90d: number,
  lastSaleDate: Date | null,
  createdDate: Date,
  isTop20ByRevenue: boolean
): VelocityResult {
  const now = new Date();
  const daysSinceCreated = differenceInDays(now, createdDate);

  if (daysSinceCreated < 60 && unitsSold90d < 10) {
    return { tier: "N", ...VELOCITY_MAP.N };
  }

  if (!lastSaleDate) {
    return { tier: "F", ...VELOCITY_MAP.F };
  }

  const daysSinceLastSale = differenceInDays(now, lastSaleDate);

  if (daysSinceLastSale > 180) return { tier: "F", ...VELOCITY_MAP.F };
  if (daysSinceLastSale > 60) return { tier: "D", ...VELOCITY_MAP.D };
  if (daysSinceLastSale > 30) return { tier: "C", ...VELOCITY_MAP.C };
  if (isTop20ByRevenue) return { tier: "A", ...VELOCITY_MAP.A };
  return { tier: "B", ...VELOCITY_MAP.B };
}

export function getVelocityWeight(tier: VelocityTier): number {
  return VELOCITY_MAP[tier].weight;
}

export interface DiscountTier {
  label: string;
  discountPct: number | null;
  isFloorPrice: boolean;
}

export function getDiscountTier(stockAgeDays: number): DiscountTier {
  if (stockAgeDays < 30)
    return { label: "No Discount", discountPct: 0, isFloorPrice: false };
  if (stockAgeDays < 60)
    return { label: "10% Off", discountPct: 0.1, isFloorPrice: false };
  if (stockAgeDays < 90)
    return { label: "20% Off", discountPct: 0.2, isFloorPrice: false };
  if (stockAgeDays < 120)
    return { label: "30% Off", discountPct: 0.3, isFloorPrice: false };
  return { label: "Cost + 10%", discountPct: null, isFloorPrice: true };
}

export function getDiscountedPrice(
  wholesalePrice: number,
  cogs: number,
  stockAgeDays: number
): number {
  const tier = getDiscountTier(stockAgeDays);
  if (tier.isFloorPrice) return cogs * 1.1;
  return wholesalePrice * (1 - (tier.discountPct ?? 0));
}

export function getAgeBucket(
  days: number
): "<30" | "30-59" | "60-89" | "90-119" | "120+" {
  if (days < 30) return "<30";
  if (days < 60) return "30-59";
  if (days < 90) return "60-89";
  if (days < 120) return "90-119";
  return "120+";
}
