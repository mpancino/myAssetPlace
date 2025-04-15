import { useMemo } from "react";
import { ProjectionResult, ProjectionPeriod } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface CashflowProjectionProps {
  projections: ProjectionResult;
  period: ProjectionPeriod;
}

export default function CashflowProjection({ projections, period }: CashflowProjectionProps) {
  // Format data for the chart
  const chartData = useMemo(() => {
    if (!projections) return [];
    
    return projections.dates.map((date, index) => ({
      date,
      "Income": projections.cashflow.totalIncome[index],
      "Expenses": -projections.cashflow.totalExpenses[index], // Negate for better visualization
      "Net Cashflow": projections.cashflow.netCashflow[index]
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
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 35 }}
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
          tickFormatter={(value) => formatCurrency(value)}
          width={80}
        />
        <Tooltip 
          formatter={(value: number) => [formatCurrency(value), ""]}
          labelFormatter={(label) => `Year: ${label}`}
        />
        <Legend />
        <ReferenceLine y={0} stroke="#000" />
        <Bar dataKey="Income" fill="#4CAF50" />
        <Bar dataKey="Expenses" fill="#F44336" />
        <Bar dataKey="Net Cashflow" fill="#2196F3" />
      </BarChart>
    </ResponsiveContainer>
  );
}