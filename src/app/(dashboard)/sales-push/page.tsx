"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
  Search,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ValueAtRiskBar } from "@/components/dashboard/charts/value-at-risk-bar";
import { AgingStackedBar } from "@/components/dashboard/charts/aging-stacked-bar";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);

const formatCurrencyPrecise = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

const ageBucketStyles: Record<string, { bg: string; text: string }> = {
  "<30": { bg: "bg-gray-100", text: "text-gray-700" },
  "30-59": { bg: "bg-yellow-100", text: "text-yellow-800" },
  "60-89": { bg: "bg-amber-100", text: "text-amber-800" },
  "90-119": { bg: "bg-orange-100", text: "text-orange-800" },
  "120+": { bg: "bg-red-100", text: "text-red-800" },
};

const velocityStyles: Record<string, { bg: string; text: string }> = {
  A: { bg: "bg-green-100", text: "text-green-800" },
  B: { bg: "bg-blue-100", text: "text-blue-800" },
  C: { bg: "bg-yellow-100", text: "text-yellow-800" },
  D: { bg: "bg-orange-100", text: "text-orange-800" },
  F: { bg: "bg-red-100", text: "text-red-800" },
  N: { bg: "bg-purple-100", text: "text-purple-800" },
};

export default function SalesPushPage() {
  const [brandId, setBrandId] = useState<number | undefined>(undefined);
  const [ageBucket, setAgeBucket] = useState<string | undefined>(undefined);
  const [topN, setTopN] = useState<number | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("valueAtRisk");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: brands } = trpc.brands.list.useQuery();

  const { data: kpi, isLoading: kpiLoading } =
    trpc.salesPush.kpiSummary.useQuery({ brandId });

  const { data: charts } = trpc.salesPush.charts.useQuery({ brandId });

  const { data: pushData, isLoading: tableLoading } =
    trpc.salesPush.pushList.useQuery({
      brandId,
      ageBucket,
      topN,
      slowMoversOnly: typeFilter === "slow" ? true : undefined,
      overstockOnly: typeFilter === "overstock" ? true : undefined,
      search: search || undefined,
      page,
      pageSize: 50,
      sortBy,
      sortDir,
    });

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  };

  const SortHeader = ({
    col,
    children,
    className,
  }: {
    col: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 ${className ?? ""}`}
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortBy === col && (
          <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
        )}
      </span>
    </TableHead>
  );

  const exportCsv = () => {
    if (!pushData) return;
    const headers = [
      "SKU",
      "Name",
      "Brand",
      "Age (days)",
      "Age Bucket",
      "Units",
      "COGS",
      "Inventory Value",
      "Wholesale Price",
      "Value at Risk",
      "Discount Tier",
      "Discounted Price",
      "30d Sales",
      "Velocity",
    ];
    const csvRows = [headers.join(",")];
    for (const r of pushData.rows) {
      csvRows.push(
        [
          `"${r.skuCode}"`,
          `"${r.skuName}"`,
          `"${r.brandName}"`,
          r.stockAgeDays,
          `"${r.ageBucket}"`,
          r.unitsOnHand,
          r.cogs.toFixed(2),
          r.inventoryValue.toFixed(2),
          r.wholesalePrice.toFixed(2),
          r.valueAtRisk.toFixed(2),
          `"${r.discountTier}"`,
          r.discountedPrice.toFixed(2),
          r.unitsSold30d,
          r.velocityTier,
        ].join(",")
      );
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-push-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = pushData
    ? Math.ceil(pushData.totals.totalRows / 50)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Push List</h1>
          <p className="text-muted-foreground">
            Aging inventory sorted by value at risk. Use discount tiers to move
            stuck cash.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: ">30 Days",
            value: kpi?.valueOver30d ?? 0,
            count: kpi?.skuCountAtRisk ?? 0,
            color: "border-yellow-300",
          },
          {
            label: ">60 Days",
            value: kpi?.valueOver60d ?? 0,
            count: null,
            color: "border-amber-400",
          },
          {
            label: ">90 Days",
            value: kpi?.valueOver90d ?? 0,
            count: null,
            color: "border-orange-400",
          },
          {
            label: ">120 Days",
            value: kpi?.valueOver120d ?? 0,
            count: kpi?.skuCount120Plus ?? 0,
            color: "border-red-500",
          },
          {
            label: "TOTAL AT RISK",
            value: kpi?.totalAtRisk ?? 0,
            count: null,
            pct: kpi?.atRiskPct,
            color:
              (kpi?.atRiskPct ?? 0) > 0.25
                ? "border-red-500 bg-red-50"
                : "border-gray-200",
          },
        ].map((card) => (
          <Card key={card.label} className={`border-l-4 ${card.color}`}>
            <CardContent className="pt-4 pb-3 px-4">
              {kpiLoading ? (
                <div className="h-12 animate-pulse rounded bg-muted" />
              ) : (
                <>
                  <div className="text-xs text-muted-foreground font-medium uppercase">
                    {card.label}
                  </div>
                  <div
                    className={`text-xl font-bold tabular-nums ${card.label === "TOTAL AT RISK" ? "text-2xl" : ""}`}
                  >
                    {formatCurrency(card.value)}
                  </div>
                  {card.count != null && (
                    <div className="text-xs text-muted-foreground">
                      {card.count} SKUs
                    </div>
                  )}
                  {"pct" in card && card.pct != null && (
                    <div className="text-xs text-muted-foreground">
                      {(card.pct * 100).toFixed(0)}% of inventory
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <ValueAtRiskBar data={charts?.top10ByValueAtRisk ?? []} />
        <AgingStackedBar data={charts?.valueByAgeBucketByBrand ?? []} />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Brand</label>
          <Select
            value={brandId?.toString() ?? "all"}
            onValueChange={(v) => {
              setBrandId(v === "all" ? undefined : Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {(brands ?? []).map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Value at Risk</label>
          <Select
            value={topN?.toString() ?? "all"}
            onValueChange={(v) => {
              setTopN(v === "all" ? undefined : Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="25">Top 25</SelectItem>
              <SelectItem value="50">Top 50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Age Bucket</label>
          <Select
            value={ageBucket ?? "all"}
            onValueChange={(v) => {
              setAgeBucket(v === "all" ? undefined : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="30-59">30-59</SelectItem>
              <SelectItem value="60-89">60-89</SelectItem>
              <SelectItem value="90-119">90-119</SelectItem>
              <SelectItem value="120+">120+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Type</label>
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="slow">Slow Movers</SelectItem>
              <SelectItem value="overstock">Overstock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search SKU code or name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          {tableLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !pushData || pushData.rows.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">
              No inventory data found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader col="skuCode">SKU</SortHeader>
                    <SortHeader col="brandName">Brand</SortHeader>
                    <SortHeader col="stockAgeDays">Stock Age</SortHeader>
                    <SortHeader col="unitsOnHand" className="text-right">
                      Units
                    </SortHeader>
                    <SortHeader col="cogs" className="text-right">
                      COGS
                    </SortHeader>
                    <SortHeader col="inventoryValue" className="text-right">
                      Inv. Value
                    </SortHeader>
                    <SortHeader col="wholesalePrice" className="text-right">
                      Wholesale
                    </SortHeader>
                    <SortHeader col="valueAtRisk" className="text-right">
                      Value at Risk
                    </SortHeader>
                    <SortHeader col="discountTier">Discount</SortHeader>
                    <SortHeader col="discountedPrice" className="text-right">
                      Disc. Price
                    </SortHeader>
                    <SortHeader col="unitsSold30d" className="text-right">
                      30d Sales
                    </SortHeader>
                    <SortHeader col="velocityTier">Velocity</SortHeader>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pushData.rows.map((row) => {
                    const ageStyle = ageBucketStyles[row.ageBucket] ?? ageBucketStyles["<30"];
                    const velStyle = velocityStyles[row.velocityTier] ?? velocityStyles.B;
                    const rowBg =
                      row.ageBucket === "120+"
                        ? "bg-red-50/50"
                        : row.ageBucket === "90-119"
                          ? "bg-orange-50/50"
                          : row.ageBucket === "60-89"
                            ? "bg-amber-50/30"
                            : row.cogsWarning
                              ? "bg-yellow-50/50"
                              : "";

                    return (
                      <TableRow key={row.skuId} className={rowBg}>
                        <TableCell>
                          <div className="font-medium text-sm">{row.skuCode}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {row.skuName}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{row.brandName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${ageStyle.bg} ${ageStyle.text} border-0 text-xs`}
                          >
                            {row.ageBucket}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.unitsOnHand.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatCurrencyPrecise(row.cogs)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.inventoryValue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatCurrencyPrecise(row.wholesalePrice)}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums font-medium ${row.valueAtRisk > 10000 ? "text-red-600 font-bold" : ""}`}
                        >
                          {formatCurrency(row.valueAtRisk)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs border-0 ${
                              row.discountTier === "No Discount"
                                ? "bg-gray-100 text-gray-600"
                                : row.discountTier === "Cost + 10%"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {row.discountTier}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatCurrencyPrecise(row.discountedPrice)}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${row.unitsSold30d === 0 ? "text-red-600 font-medium" : ""}`}
                        >
                          {row.unitsSold30d}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${velStyle.bg} ${velStyle.text} border-0 text-xs`}
                          >
                            {row.velocityTier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.cogsWarning && (
                            <span title="Missing COGS - update master cost sheet">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Footer Totals */}
              <div className="border-t bg-muted/30 px-4 py-3 flex items-center justify-between text-sm">
                <div className="flex gap-6 text-muted-foreground">
                  <span>
                    <strong className="text-foreground">
                      {pushData.totals.totalUnits.toLocaleString()}
                    </strong>{" "}
                    units
                  </span>
                  <span>
                    <strong className="text-foreground">
                      {formatCurrency(pushData.totals.totalInventoryValue)}
                    </strong>{" "}
                    inventory
                  </span>
                  <span>
                    <strong className="text-red-600">
                      {formatCurrency(pushData.totals.totalValueAtRisk)}
                    </strong>{" "}
                    at risk
                  </span>
                </div>

                {/* Pagination */}
                {!topN && totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
