"use client";

import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { RevenueTrendChart } from "@/components/dashboard/charts/revenue-trend-chart";
import { BrandHealthCard } from "@/components/dashboard/charts/brand-health-card";
import { ActionCenter } from "@/components/dashboard/charts/action-center";
import { SupplyValidationCard } from "@/components/dashboard/charts/supply-validation-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

const BRAND_COLORS: Record<string, string> = {
  "House of Party": "#FF6B35",
  Roofus: "#4ECDC4",
  Fomin: "#45B7D1",
  "Luna Naturals": "#DDA0DD",
  EveryMood: "#98D8C8",
  "Craft Hero": "#F7DC6F",
};

export default function DashboardPage() {
  const { data: validationData, isLoading: validationLoading } =
    trpc.dashboard.supplyValidation.useQuery({ months: 3 });
  const { data: brandHealthData, isLoading: brandHealthLoading } =
    trpc.dashboard.brandHealth.useQuery();
  const { data: revenueTrendData, isLoading: revenueTrendLoading } =
    trpc.dashboard.revenueTrend.useQuery({ months: 12 });
  const { data: actionItemsData, isLoading: actionItemsLoading } =
    trpc.dashboard.actionItems.useQuery();

  // Group validation data by brand
  const validationByBrand = new Map<
    string,
    NonNullable<typeof validationData>
  >();
  if (validationData) {
    for (const entry of validationData) {
      const existing = validationByBrand.get(entry.brandName) ?? [];
      existing.push(entry);
      validationByBrand.set(entry.brandName, existing);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Command Center
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* A) KPI Strip */}
      <KpiStrip />

      {/* B) Supply Validation — THE HERO SECTION */}
      <Card>
        <CardHeader>
          <CardTitle>Can We Hit Our Targets?</CardTitle>
          <p className="text-sm text-muted-foreground">
            4-Layer Confidence Engine: Velocity scoring, pipeline reliability, demand capping, concentration risk
          </p>
        </CardHeader>
        <CardContent>
          {validationLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : validationByBrand.size === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <div className="text-lg font-medium mb-1">No brands found</div>
              <div className="text-sm">
                Add brands and set revenue targets on the Data Import page
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(validationByBrand.entries()).map(
                ([brandName, entries]) => (
                  <div key={brandName}>
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            BRAND_COLORS[brandName] ?? "#8884d8",
                        }}
                      />
                      <h3 className="font-semibold">{brandName}</h3>
                      <span className="text-xs text-muted-foreground">
                        {entries[0]?.totalSkus} SKUs
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {entries.map((entry) => (
                        <SupplyValidationCard
                          key={`${entry.brandId}-${entry.monthLabel}`}
                          monthLabel={entry.monthLabel}
                          revenueTarget={entry.revenueTarget}
                          revenueActual={entry.revenueActual}
                          progressPct={entry.progressPct}
                          rawInventoryValue={entry.rawInventoryValue}
                          rawCoverage={entry.rawCoverage}
                          effectiveRevenuePotential={entry.effectiveRevenuePotential}
                          adjustedCoverage={entry.adjustedCoverage}
                          concentrationPenalty={entry.concentrationPenalty}
                          inventoryQualityGap={entry.inventoryQualityGap}
                          qualityGapPct={entry.qualityGapPct}
                          channelThreshold={entry.channelThreshold}
                          bufferNeeded={entry.bufferNeeded}
                          bufferGap={entry.bufferGap}
                          velocityBreakdown={entry.velocityBreakdown}
                          totalSkus={entry.totalSkus}
                          deadStockValue={entry.deadStockValue}
                          staleStockValue={entry.staleStockValue}
                          top3Share={entry.top3Share}
                          top3Skus={entry.top3Skus}
                          topGapSkus={entry.topGapSkus}
                          status={entry.status}
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* C) Brand Health Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Brand Health</h2>
        {brandHealthLoading ? (
          <div className="grid gap-4 md:grid-cols-3 sm:grid-cols-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 sm:grid-cols-2">
            {(brandHealthData ?? []).map((brand) => (
              <BrandHealthCard
                key={brand.brandId}
                brandName={brand.brandName}
                revenueMTD={brand.revenueMTD}
                revenueTrendPct={brand.revenueTrendPct}
                topRetailer={brand.topRetailer}
                topSku={brand.topSku}
                daysOfSupply={brand.daysOfSupply}
                inventorySignal={brand.inventorySignal}
                activePOCount={brand.activePOCount}
              />
            ))}
          </div>
        )}
      </div>

      {/* D) Revenue Trend Chart */}
      <RevenueTrendChart
        data={revenueTrendData ?? []}
        isLoading={revenueTrendLoading}
      />

      {/* E) Action Center */}
      <ActionCenter
        data={actionItemsData ?? []}
        isLoading={actionItemsLoading}
      />
    </div>
  );
}
