import { useMemo } from "react";
import { ProjectionResult, ProjectionPeriod } from "@shared/schema";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ProjectionChartProps {
  projections: ProjectionResult;
  period: ProjectionPeriod;
}

export default function ProjectionChart({ projections, period }: ProjectionChartProps) {
  // Format data for the chart
  const chartData = useMemo(() => {
    if (!projections) return [];
    
    return projections.dates.map((date, index) => ({
      date,
      "Assets": Math.max(projections.totalAssetValue[index], 0), // Ensure non-negative for display
      "Liabilities": Math.abs(projections.totalLiabilityValue[index]), // Make liabilities positive for better visualization
      "Net Worth": projections.netWorth[index],
      // Add a property to determine if net worth is negative
      "isNegative": projections.netWorth[index] < 0
    }));
  }, [projections]);
  
  // Determine X-axis tick interval based on period
  const getTickInterval = (period: ProjectionPeriod, totalYears: number): number => {
    if (totalYears <= 1) return 1; // Show all months
    if (totalYears <= 5) return 1; // Show each year
    if (totalYears <= 10) return 2; // Show every other year
    if (totalYears <= 20) return 5; // Show every 5 years
    return 10; // Show every 10 years for longer periods
  };
  
  // Find min and max values for better Y-axis scaling
  const minNetWorth = Math.min(...projections.netWorth);
  const maxNetWorth = Math.max(...projections.netWorth);
  const maxAssets = Math.max(...projections.totalAssetValue.map(v => Math.max(v, 0)));
  
  // Calculate domain with some padding for better visual appeal
  const yDomainMin = Math.min(minNetWorth, 0) * 1.1; // 10% padding below
  const yDomainMax = Math.max(maxNetWorth, maxAssets) * 1.1; // 10% padding above
  
  const tickInterval = getTickInterval(period, projections.dates.length - 1);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={chartData}
        margin={{ top: 15, right: 30, left: 20, bottom: 35 }}
      >
        <defs>
          <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F44336" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#F44336" stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#2196F3" stopOpacity={0.2}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.2} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${value}`}
          interval={tickInterval}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          tickFormatter={(value) => formatCurrency(value, true)}
          width={80}
          domain={[yDomainMin, yDomainMax]}
        />
        <Tooltip 
          formatter={(value: number, name: string) => {
            if (name === "Liabilities") {
              return [formatCurrency(-value), "Liabilities"]; // Show as negative
            }
            return [formatCurrency(value), name];
          }}
          labelFormatter={(label) => `Year: ${label}`}
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #ccc',
            borderRadius: '6px',
            padding: '10px'
          }}
        />
        <Legend 
          verticalAlign="top"
          wrapperStyle={{ paddingBottom: '10px' }}
        />
        <ReferenceLine y={0} stroke="#000" strokeWidth={1.5} />
        
        <Area 
          type="monotone" 
          dataKey="Assets" 
          stroke="#4CAF50" 
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorAssets)"
          dot={{ r: 2 }}
          activeDot={{ r: 5, strokeWidth: 1 }}
        />
        
        <Area 
          type="monotone" 
          dataKey="Liabilities" 
          stroke="#F44336" 
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorLiabilities)"
          dot={{ r: 2 }}
          activeDot={{ r: 5, strokeWidth: 1 }}
          stackId="liabilities" // Stacking to make sure it's below the zero line
        />
        
        <Line 
          type="monotone" 
          dataKey="Net Worth" 
          stroke="#2196F3" 
          strokeWidth={3}
          dot={{ r: 3, fill: "#2196F3" }}
          activeDot={{ r: 6, strokeWidth: 1 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}