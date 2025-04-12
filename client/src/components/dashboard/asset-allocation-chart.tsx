import { useMemo } from "react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetClass, Asset, AssetHoldingType } from "@shared/schema";

interface AssetAllocationChartProps {
  assets: Asset[];
  assetClasses: AssetClass[];
  holdingTypes: AssetHoldingType[];
  viewBy: "assetClass" | "holdingType";
}

export function AssetAllocationChart({ 
  assets, 
  assetClasses,
  holdingTypes,
  viewBy 
}: AssetAllocationChartProps) {
  // Filter out liabilities
  const filtered = assets.filter(asset => !asset.isLiability);
  
  // Calculate asset allocation data
  const chartData = useMemo(() => {
    if (viewBy === "assetClass") {
      // Group assets by asset class
      const assetsByClass: Record<number, { value: number, name: string, color: string }> = {};
      
      filtered.forEach(asset => {
        const assetClass = assetClasses.find(c => c.id === asset.assetClassId);
        if (!assetClass) return;
        
        if (!assetsByClass[asset.assetClassId]) {
          assetsByClass[asset.assetClassId] = {
            value: 0,
            name: assetClass.name,
            color: assetClass.color || "#" + Math.floor(Math.random()*16777215).toString(16) // Fallback random color
          };
        }
        
        assetsByClass[asset.assetClassId].value += asset.value;
      });
      
      return Object.values(assetsByClass);
    } else {
      // Group assets by holding type
      const assetsByHoldingType: Record<number, { value: number, name: string, color: string }> = {};
      
      filtered.forEach(asset => {
        const holdingType = holdingTypes.find(h => h.id === asset.assetHoldingTypeId);
        if (!holdingType) return;
        
        if (!assetsByHoldingType[asset.assetHoldingTypeId]) {
          assetsByHoldingType[asset.assetHoldingTypeId] = {
            value: 0,
            name: holdingType.name,
            // Generate different colors for holding types
            color: "#" + ((Math.floor(Math.random()*16777215) + asset.assetHoldingTypeId * 25) % 16777215).toString(16)
          };
        }
        
        assetsByHoldingType[asset.assetHoldingTypeId].value += asset.value;
      });
      
      return Object.values(assetsByHoldingType);
    }
  }, [assets, assetClasses, holdingTypes, viewBy, filtered]);

  // Calculate total assets value
  const totalValue = useMemo(() => {
    return filtered.reduce((sum, asset) => sum + asset.value, 0);
  }, [filtered]);

  // Format currency 
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalValue) * 100).toFixed(1);
      
      return (
        <div className="bg-background border border-border p-2 rounded-md shadow-md">
          <p className="font-medium">{data.name}</p>
          <p>{formatCurrency(data.value)}</p>
          <p>{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Asset Allocation by {viewBy === "assetClass" ? "Asset Class" : "Holding Type"}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={customTooltip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex justify-center items-center h-[300px]">
            <p className="text-muted-foreground">No assets to display</p>
          </div>
        )}
        <div className="mt-4 text-center">
          <p className="text-muted-foreground">Total Assets: {formatCurrency(totalValue)}</p>
        </div>
      </CardContent>
    </Card>
  );
}