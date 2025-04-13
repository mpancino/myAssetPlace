import { useState, useEffect } from "react";
import { calculateSavingsInterest, generateSavingsProjection } from "@shared/calculations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, addMonths } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";

type InterestCalculatorProps = {
  initialBalance: number;
  interestRate: number;
};

type ProjectionData = {
  month: number;
  balance: number;
  interestEarned: number;
  totalInterest: number;
  deposits: number;
  date?: string;
};

export function InterestCalculator({ initialBalance, interestRate }: InterestCalculatorProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [rate, setRate] = useState(interestRate / 100); // Convert from percentage to decimal
  const [monthlyDeposit, setMonthlyDeposit] = useState(0);
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [compoundingFrequency, setCompoundingFrequency] = useState<"daily" | "monthly" | "quarterly" | "annually">("monthly");
  const [projectionData, setProjectionData] = useState<ProjectionData[]>([]);
  const [summaryData, setSummaryData] = useState<{ finalBalance: number; interestEarned: number }>({
    finalBalance: 0,
    interestEarned: 0,
  });

  // Calculate interest whenever inputs change
  useEffect(() => {
    if (balance > 0) {
      // Get summary data
      const summary = calculateSavingsInterest(
        balance, 
        rate, 
        projectionMonths, 
        compoundingFrequency, 
        monthlyDeposit
      );
      
      setSummaryData(summary);
      
      // Generate detailed projection data
      const projection = generateSavingsProjection(
        balance,
        rate,
        projectionMonths,
        compoundingFrequency,
        monthlyDeposit
      );
      
      // Add formatted dates to projection data
      const today = new Date();
      const projectionWithDates = projection.map(item => ({
        ...item,
        date: format(addMonths(today, item.month - 1), 'MMM yyyy')
      }));
      
      setProjectionData(projectionWithDates);
    }
  }, [balance, rate, projectionMonths, compoundingFrequency, monthlyDeposit]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Interest Calculator</CardTitle>
        <CardDescription>
          Calculate potential interest earnings for this account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="balance">Initial Balance</Label>
              <Input
                id="balance"
                type="number"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="interest-rate">Interest Rate (%)</Label>
              <Input
                id="interest-rate"
                type="number"
                step="0.01"
                value={(rate * 100).toFixed(2)}
                onChange={(e) => setRate(parseFloat(e.target.value) / 100 || 0)}
              />
            </div>

            <div>
              <Label htmlFor="monthly-deposit">Monthly Deposit</Label>
              <Input
                id="monthly-deposit"
                type="number"
                value={monthlyDeposit}
                onChange={(e) => setMonthlyDeposit(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label>Projection Period: {projectionMonths} months</Label>
              <Slider
                value={[projectionMonths]}
                min={1}
                max={120}
                step={1}
                onValueChange={(value) => setProjectionMonths(value[0])}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="compounding">Compounding Frequency</Label>
              <Select
                value={compoundingFrequency}
                onValueChange={(value) => setCompoundingFrequency(value as any)}
              >
                <SelectTrigger id="compounding">
                  <SelectValue placeholder="Select compounding frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-md">
              <h4 className="font-medium mb-2">Summary</h4>
              <p>
                <span className="text-muted-foreground">Final Balance:</span>{" "}
                <span className="font-semibold">{summaryData.finalBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Interest Earned:</span>{" "}
                <span className="font-semibold">{summaryData.interestEarned.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
              </p>
              {monthlyDeposit > 0 && (
                <p>
                  <span className="text-muted-foreground">Total Deposits:</span>{" "}
                  <span className="font-semibold">{(monthlyDeposit * projectionMonths).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Tabs defaultValue="chart">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chart" className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={projectionData}
                    margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end" 
                      height={50}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => 
                        value >= 1000 
                          ? `$${(value / 1000).toFixed(1)}k` 
                          : `$${value}`
                      }
                    />
                    <Tooltip 
                      formatter={(value) => [`$${parseFloat(value as string).toFixed(2)}`, ""]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      name="Balance"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalInterest"
                      name="Interest"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="table">
                <div className="max-h-[320px] overflow-auto">
                  <Table>
                    <TableCaption>Projection over {projectionMonths} months</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Monthly Interest</TableHead>
                        <TableHead>Total Interest</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectionData.map((data) => (
                        <TableRow key={data.month}>
                          <TableCell className="font-medium">{data.date}</TableCell>
                          <TableCell>
                            {data.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </TableCell>
                          <TableCell>
                            {data.interestEarned.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </TableCell>
                          <TableCell>
                            {data.totalInterest.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}