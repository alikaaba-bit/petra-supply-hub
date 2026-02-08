"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Package,
  Box,
  Store,
  FileText,
  Database,
  TrendingUp,
  ShoppingCart,
  ShoppingBag,
  AlertTriangle,
  Activity,
  Truck,
  ClipboardList,
  BarChart3,
  Users,
  Clipboard,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navSections = [
  {
    label: "Overview",
    items: [
      {
        title: "Executive Summary",
        href: "/executive",
        icon: Activity,
      },
    ],
  },
  {
    label: "Demand",
    items: [
      {
        title: "Summary",
        href: "/demand",
        icon: AlertTriangle,
      },
      {
        title: "By Retailer",
        href: "/demand/by-retailer",
        icon: Store,
      },
      {
        title: "By SKU",
        href: "/demand/by-sku",
        icon: Box,
      },
    ],
  },
  {
    label: "Tracking",
    items: [
      {
        title: "Supplier Orders",
        href: "/tracking/supplier-orders",
        icon: Truck,
      },
      {
        title: "Retail Orders",
        href: "/tracking/retail-orders",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        title: "Data Pipeline",
        href: "/import",
        icon: Database,
      },
      {
        title: "Forecasts",
        href: "/forecasts",
        icon: TrendingUp,
      },
    ],
  },
  {
    label: "Orders",
    items: [
      {
        title: "Purchase Orders",
        href: "/orders/purchase-orders",
        icon: ShoppingCart,
      },
      {
        title: "Retail Orders",
        href: "/orders/retail-orders",
        icon: ShoppingBag,
      },
    ],
  },
  {
    label: "Role Views",
    items: [
      {
        title: "CEO Overview",
        href: "/roles/ceo",
        icon: BarChart3,
      },
      {
        title: "Sales View",
        href: "/roles/sales",
        icon: Users,
      },
      {
        title: "Purchasing View",
        href: "/roles/purchasing",
        icon: Clipboard,
      },
      {
        title: "Warehouse View",
        href: "/roles/warehouse",
        icon: Warehouse,
      },
    ],
  },
  {
    label: "Master Data",
    items: [
      {
        title: "Brands",
        href: "/brands",
        icon: Package,
      },
      {
        title: "SKUs",
        href: "/skus",
        icon: Box,
      },
      {
        title: "Retailers",
        href: "/retailers",
        icon: Store,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Audit Log",
        href: "/audit",
        icon: FileText,
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-6 py-4">
          <h1 className="text-xl font-bold">Petra Supply Hub</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  // For "/" use exact match, for others use startsWith to match nested routes
                  const isActive = item.href === "/"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground">
          Version 1.0.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
