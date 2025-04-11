import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Briefcase } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  icon: "money" | "income" | "trendingUp";
  href: string;
  valuePrefix?: string;
  valueSuffix?: string;
  colorScheme?: "primary" | "success";
}

export default function StatsCard({
  title,
  value,
  icon,
  href,
  valuePrefix = "$",
  valueSuffix = "",
  colorScheme = "primary"
}: StatsCardProps) {
  let IconComponent: ReactNode;
  
  // Format value
  let formattedValue = value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  if (valueSuffix === "%") {
    formattedValue = value.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }
  
  // Determine icon
  switch (icon) {
    case "money":
      IconComponent = <DollarSign className="h-6 w-6 text-primary-600" />;
      break;
    case "income":
      IconComponent = <Briefcase className="h-6 w-6 text-success-600" />;
      break;
    case "trendingUp":
      IconComponent = <TrendingUp className="h-6 w-6 text-primary-600" />;
      break;
    default:
      IconComponent = <DollarSign className="h-6 w-6 text-primary-600" />;
  }
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-center">
            <div className={cn(
              "flex-shrink-0 rounded-md p-3",
              colorScheme === "primary" ? "bg-primary-100" : "bg-success-100"
            )}>
              {IconComponent}
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-500 truncate">
                  {title}
                </dt>
                <dd>
                  <div className="text-lg font-semibold text-slate-900">
                    {valuePrefix && valuePrefix}{formattedValue}{valueSuffix && valueSuffix}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-5 py-3">
          <div className="text-sm">
            <a href={href} className="font-medium text-primary-600 hover:text-primary-500">
              View details
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
