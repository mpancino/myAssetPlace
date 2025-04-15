import { useMemo } from "react";
import { ProjectionResult, ProjectionPeriod } from "@shared/schema";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  ReferenceLine,
  Cell
} from "recharts";
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
      "Net Cashflow": projections.cashflow.netCashflow[index],
      "isPositive": projections.cashflow.netCashflow[index] >= 0
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
  const cashflows = projections.cashflow.netCashflow;
  const incomes = projections.cashflow.totalIncome;
  const expenses = projections.cashflow.totalExpenses.map(e => -e); // Negate expenses for visualization
  
  const minCashflow = Math.min(...cashflows, ...expenses);
  const maxCashflow = Math.max(...cashflows, ...incomes);
  
  // Calculate domain with some padding for better visual appeal
  const yDomainMin = Math.min(minCashflow, 0) * 1.1; // 10% padding below
  const yDomainMax = Math.max(maxCashflow, 0) * 1.1; // 10% padding above
  
  const tickInterval = getTickInterval(period, projections.dates.length - 1);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 15, right: 30, left: 20, bottom: 35 }}
        barGap={0}
        barCategoryGap="10%"
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
          domain={[yDomainMin, yDomainMax]}
        />
        <Tooltip 
          formatter={(value: number, name: string) => {
            if (name === "Expenses") {
              // Format expenses as negative
              return [formatCurrency(value), "Expenses"];
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
        
        <Bar 
          dataKey="Income" 
          name="Income"
          fill="#4CAF50"
          radius={[4, 4, 0, 0]}
        />
        
        <Bar 
          dataKey="Expenses" 
          name="Expenses"
          fill="#F44336"
          radius={[4, 4, 0, 0]}
        />
        
        <Bar 
          dataKey="Net Cashflow" 
          name="Net Cashflow"
          radius={[4, 4, 0, 0]}
        >
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.isPositive ? '#2196F3' : '#FF9800'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}