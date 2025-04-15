import { useMemo } from "react";
import { ProjectionResult, ProjectionPeriod } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
      "Assets": projections.totalAssetValue[index],
      "Liabilities": projections.totalLiabilityValue[index],
      "Net Worth": projections.netWorth[index]
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
  
  const tickInterval = getTickInterval(period, projections.dates.length - 1);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 35 }}
      >
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
        />
        <Tooltip 
          formatter={(value: number) => [formatCurrency(value), ""]}
          labelFormatter={(label) => `Year: ${label}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="Assets" 
          stroke="#4CAF50" 
          strokeWidth={2} 
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line 
          type="monotone" 
          dataKey="Liabilities" 
          stroke="#F44336" 
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line 
          type="monotone" 
          dataKey="Net Worth" 
          stroke="#2196F3" 
          strokeWidth={3}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}