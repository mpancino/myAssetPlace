import { useMemo, useState } from "react";
import { ProjectionResult } from "@shared/schema";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AssetClassBreakdownProps {
  projections: ProjectionResult;
}

export default function AssetClassBreakdown({ projections }: AssetClassBreakdownProps) {
  // State for selected year index
  const [yearIndex, setYearIndex] = useState(0);
  
  // Get available year options from projections
  const yearOptions = useMemo(() => {
    return projections.dates.map((date, index) => ({ 
      label: date, 
      value: index.toString() 
    }));
  }, [projections]);
  
  // Format data for the chart
  const chartData = useMemo(() => {
    if (!projections) return [];
    
    const selectedIndex = parseInt(yearIndex.toString());
    
    return projections.assetBreakdown
      .filter(item => item.values[selectedIndex] > 0) // Only include positive values
      .map(item => ({
        name: item.assetClass,
        value: item.values[selectedIndex],
        id: item.assetClassId
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
  }, [projections, yearIndex]);
  
  // For liabilities chart
  const liabilityChartData = useMemo(() => {
    if (!projections) return [];
    
    const selectedIndex = parseInt(yearIndex.toString());
    
    return projections.assetBreakdown
      .filter(item => item.values[selectedIndex] < 0) // Only include negative values
      .map(item => ({
        name: item.assetClass,
        value: Math.abs(item.values[selectedIndex]), // Make positive for chart
        id: item.assetClassId
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
  }, [projections, yearIndex]);
  
  // Colors for different asset classes
  const COLORS = [
    '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#CDDC39',
    '#00BCD4', '#3F51B5', '#FF5722', '#795548', '#607D8B'
  ];
  
  // Liability colors - reddish
  const LIABILITY_COLORS = [
    '#F44336', '#E91E63', '#D32F2F', '#C2185B', '#B71C1C'
  ];
  
  // Active shape for hover effect
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };
  
  // State for active sector
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(null);
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center">
        <Label htmlFor="year-select" className="mr-2">Select Year:</Label>
        <Select
          value={yearIndex.toString()}
          onValueChange={(value) => setYearIndex(parseInt(value))}
        >
          <SelectTrigger className="w-[180px]" id="year-select">
            <SelectValue placeholder="Select a year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((option, index) => (
              <SelectItem key={index} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        <div className="flex flex-col h-full">
          <h3 className="text-lg font-medium mb-2 text-center">Assets Breakdown</h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No asset data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  activeIndex={activeIndex !== null ? activeIndex : undefined}
                  activeShape={renderActiveShape}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), "Value"]} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        
        <div className="flex flex-col h-full">
          <h3 className="text-lg font-medium mb-2 text-center">Liabilities Breakdown</h3>
          {liabilityChartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No liability data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={liabilityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {liabilityChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={LIABILITY_COLORS[index % LIABILITY_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), "Value"]} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}