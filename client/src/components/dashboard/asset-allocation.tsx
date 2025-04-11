import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import { AssetClass } from "@shared/schema";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface AssetAllocationProps {
  data: { assetClass: AssetClass; totalValue: number }[];
}

export default function AssetAllocation({ data }: AssetAllocationProps) {
  // Chart data formatting
  const chartData = data.map((item) => ({
    name: item.assetClass.name,
    value: item.totalValue,
  }));

  // Calculate total value for percentages
  const totalValue = data.reduce((sum, item) => sum + item.totalValue, 0);

  // Generate colors
  const COLORS = ["#3b82f6", "#10b981", "#64748b", "#f59e0b", "#ef4444"];

  // Add percentage to each item
  const dataWithPercentage = data.map((item, index) => ({
    ...item,
    percentage: totalValue ? Math.round((item.totalValue / totalValue) * 100) : 0,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <section className="mb-6">
      <Card>
        <CardHeader className="px-5 py-4 border-b border-slate-200">
          <CardTitle className="text-lg font-semibold text-slate-900">Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="bg-slate-50 rounded-lg flex items-center justify-center" style={{ height: 300 }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="mx-auto h-12 w-12 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-slate-500">No assets to display</p>
                </div>
              )}
            </div>
            
            {/* Asset breakdown table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Asset Class</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Allocation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataWithPercentage.length > 0 ? (
                    dataWithPercentage.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <div className="text-sm font-medium text-slate-900">
                              {item.assetClass.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-900">
                            ${item.totalValue.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-900">
                            {item.percentage}%
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-500">
                        No asset data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
