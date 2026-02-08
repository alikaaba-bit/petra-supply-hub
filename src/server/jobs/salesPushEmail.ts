/**
 * Sales Push Email Digest
 *
 * Generates and sends weekly sales push emails per brand.
 * Schedule: Every Monday at 7:00 AM ET (configure via cron or external scheduler)
 *
 * Usage:
 *   npx tsx src/server/jobs/salesPushEmail.ts
 *
 * Requires RESEND_API_KEY environment variable.
 * Install: npm install resend
 */

// Brand → sales rep email mapping
// TODO: Move to brands table or admin config
const brandEmailMap: Record<number, string[]> = {
  1: ["sales@petrabrands.com"], // Fomin
  2: ["sales@petrabrands.com"], // House of Party
  3: ["sales@petrabrands.com"], // EveryMood
  4: ["sales@petrabrands.com"], // Roofus
  5: ["sales@petrabrands.com"], // Luna Naturals
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

interface DigestData {
  brandName: string;
  totalAtRisk: number;
  top10: Array<{
    skuCode: string;
    skuName: string;
    units: number;
    valueAtRisk: number;
    ageDays: number;
    discountTier: string;
  }>;
  bucketCounts: Record<string, number>;
  slowMoverCount: number;
  cogsWarnings: number;
  generatedAt: string;
}

export function buildEmailHtml(data: DigestData, brandId: number): string {
  const skuRows = data.top10
    .map(
      (s, i) =>
        `${i + 1}. ${s.skuCode} — ${s.skuName} — ${formatCurrency(s.valueAtRisk)} (${s.ageDays} days, ${s.discountTier})`
    )
    .join("\n");

  const bucketSummary = Object.entries(data.bucketCounts)
    .map(([bucket, count]) => `  ${bucket}: ${count} SKUs`)
    .join("\n");

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="margin: 0 0 8px;">Sales Push — ${data.brandName}</h2>
      <p style="color: #666; margin: 0 0 20px;">Week of ${data.generatedAt}</p>

      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 14px; color: #991B1B;">TOTAL VALUE AT RISK</div>
        <div style="font-size: 28px; font-weight: bold; color: #DC2626;">
          ${formatCurrency(data.totalAtRisk)}
        </div>
        <div style="font-size: 12px; color: #666;">
          ${data.slowMoverCount} slow movers (zero 30d sales)
          ${data.cogsWarnings > 0 ? ` · ${data.cogsWarnings} missing COGS` : ""}
        </div>
      </div>

      <h3 style="margin: 0 0 12px;">Top 10 by Value at Risk</h3>
      <pre style="background: #F9FAFB; padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.6; overflow-x: auto;">
${skuRows}
      </pre>

      <h3 style="margin: 20px 0 12px;">Age Distribution</h3>
      <pre style="background: #F9FAFB; padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.6;">
${bucketSummary}
      </pre>

      <div style="margin-top: 24px;">
        <a href="${APP_URL}/sales-push?brand=${brandId}"
           style="background: #2563EB; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          View Full List
        </a>
      </div>

      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        — Petra Supply Hub
      </p>
    </div>
  `;
}

export async function sendSalesPushDigest() {
  // Dynamic import so this file doesn't fail if resend isn't installed yet
  let Resend: any;
  try {
    // @ts-ignore - resend may not be installed yet
    const mod = await import("resend");
    Resend = mod.Resend;
  } catch {
    console.error(
      "resend package not installed. Run: npm install resend"
    );
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set");
    return;
  }

  const resend = new Resend(apiKey);

  // Use tRPC caller for server-side calls
  // This would need to be set up with your createCaller pattern
  // For now, this shows the structure
  console.log("Sales Push Email Digest - would send emails for brands:", Object.keys(brandEmailMap));
  console.log("Configure RESEND_API_KEY and update brandEmailMap to enable.");
}

// Run directly: npx tsx src/server/jobs/salesPushEmail.ts
if (require.main === module) {
  sendSalesPushDigest().catch(console.error);
}
