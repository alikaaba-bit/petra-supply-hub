"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BrandSelectorProps {
  selectedBrandId: number | undefined;
  onBrandChange: (brandId: number | undefined) => void;
}

export function BrandSelector({ selectedBrandId, onBrandChange }: BrandSelectorProps) {
  const { data: brands, isLoading } = trpc.brands.list.useQuery();

  return (
    <Select
      value={selectedBrandId?.toString() ?? "all"}
      onValueChange={(value) => {
        onBrandChange(value === "all" ? undefined : parseInt(value, 10));
      }}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select brand..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Brands</SelectItem>
        {isLoading ? (
          <SelectItem value="loading" disabled>
            Loading...
          </SelectItem>
        ) : (
          brands?.map((brand) => (
            <SelectItem key={brand.id} value={brand.id.toString()}>
              {brand.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
