"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  CheckCircle,
  Clock,
  Package,
  Truck,
  Warehouse,
} from "lucide-react";
import { format } from "date-fns";

interface POTimelineProps {
  currentStatus: string;
  orderDate?: Date | null;
  expectedArrival?: Date | null;
  actualArrival?: Date | null;
}

interface TimelineStep {
  status: string;
  label: string;
  icon: React.ElementType;
  date?: Date | null;
}

export function POTimeline({
  currentStatus,
  orderDate,
  expectedArrival,
  actualArrival,
}: POTimelineProps) {
  // Define the 6-step timeline
  const steps: TimelineStep[] = [
    { status: "ordered", label: "Ordered", icon: Check, date: orderDate },
    { status: "confirmed", label: "Confirmed", icon: CheckCircle },
    { status: "in_production", label: "In Production", icon: Clock },
    { status: "shipped", label: "Shipped", icon: Package },
    { status: "in_transit", label: "In Transit", icon: Truck },
    {
      status: "arrived",
      label: "Arrived",
      icon: Warehouse,
      date: actualArrival || expectedArrival,
    },
  ];

  // Determine the current step index
  const currentIndex = steps.findIndex(
    (step) => step.status === currentStatus.toLowerCase()
  );

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <Card key={step.status}>
            <CardContent className="flex items-center gap-4 p-4">
              {/* Status circle */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isComplete
                    ? "bg-green-100"
                    : isCurrent
                      ? "bg-blue-100"
                      : "bg-gray-100"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isComplete
                      ? "text-green-600"
                      : isCurrent
                        ? "text-blue-600"
                        : "text-gray-400"
                  }`}
                />
              </div>

              {/* Step info */}
              <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{step.label}</span>
                  {isComplete && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      Complete
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800"
                    >
                      Current
                    </Badge>
                  )}
                </div>
                {step.date ? (
                  <span className="text-sm text-muted-foreground">
                    {format(step.date, "MMM d, yyyy")}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {isFuture ? "Not yet scheduled" : ""}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
