import { useMemo } from "react";
import { ProjectionResult, ProjectionPeriod } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectionTablesProps {
  projections: ProjectionResult;
  period: ProjectionPeriod;
}

export default function ProjectionTables({ projections, period }: ProjectionTablesProps) {
  // Generate Net Worth Table Data
  const netWorthTableData = useMemo(() => {
    if (!projections) return [];
    
    return projections.dates.map((date, index) => ({
      date,
      assets: projections.totalAssetValue[index],
      liabilities: projections.totalLiabilityValue[index],
      netWorth: projections.netWorth[index]
    }));
  }, [projections]);

  // Generate Cashflow Table Data
  const cashflowTableData = useMemo(() => {
    if (!projections) return [];
    
    return projections.dates.map((date, index) => ({
      date,
      income: projections.cashflow.totalIncome[index],
      expenses: projections.cashflow.totalExpenses[index],
      netCashflow: projections.cashflow.netCashflow[index]
    }));
  }, [projections]);

  // Generate Asset Breakdown Table Data
  const assetBreakdownTableData = useMemo(() => {
    if (!projections || !projections.assetBreakdown) return [];
    
    // First, get all unique asset classes
    const assetClasses = projections.assetBreakdown.map(item => item.assetClass);
    
    // Then, for each date, gather the values
    return projections.dates.map((date, dateIndex) => {
      const row: any = { date };
      
      // Add a column for each asset class
      projections.assetBreakdown.forEach(assetItem => {
        row[assetItem.assetClass] = assetItem.values[dateIndex];
      });
      
      return row;
    });
  }, [projections]);

  // Get all unique asset classes for the column headers
  const assetClassColumns = useMemo(() => {
    if (!projections || !projections.assetBreakdown) return [];
    return projections.assetBreakdown.map(item => item.assetClass);
  }, [projections]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projection Data Tables</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="networth" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="networth">Net Worth</TabsTrigger>
            <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
            <TabsTrigger value="breakdown">Asset Breakdown</TabsTrigger>
          </TabsList>
          
          <TabsContent value="networth">
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead>Liabilities</TableHead>
                    <TableHead>Net Worth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {netWorthTableData.map((row, index) => (
                    <TableRow key={index} className={index === 0 ? "bg-secondary/20" : ""}>
                      <TableCell className="font-medium">{row.date}</TableCell>
                      <TableCell>{formatCurrency(row.assets)}</TableCell>
                      <TableCell>{formatCurrency(row.liabilities)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(row.netWorth)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="cashflow">
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Income</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Net Cashflow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashflowTableData.map((row, index) => (
                    <TableRow key={index} className={index === 0 ? "bg-secondary/20" : ""}>
                      <TableCell className="font-medium">{row.date}</TableCell>
                      <TableCell>{formatCurrency(row.income)}</TableCell>
                      <TableCell>{formatCurrency(row.expenses)}</TableCell>
                      <TableCell className={row.netCashflow >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(row.netCashflow)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="breakdown">
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    {assetClassColumns.map((assetClass, i) => (
                      <TableHead key={i}>{assetClass}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetBreakdownTableData.map((row, index) => (
                    <TableRow key={index} className={index === 0 ? "bg-secondary/20" : ""}>
                      <TableCell className="font-medium">{row.date}</TableCell>
                      {assetClassColumns.map((assetClass, i) => (
                        <TableCell key={i}>
                          {formatCurrency(row[assetClass] || 0)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}