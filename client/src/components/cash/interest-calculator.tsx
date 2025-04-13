import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  generateSavingsProjection,
  calculateSavingsInterest
} from "@shared/calculations";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CompoundingFrequency = 'daily' | 'monthly' | 'quarterly' | 'annually';

interface InterestCalculatorProps {
  initialBalance: number;
  interestRate?: number;
}

export function InterestCalculator({ initialBalance, interestRate = 0 }: InterestCalculatorProps) {
  // State for calculator inputs
  const [balance, setBalance] = useState(initialBalance || 0);
  const [rate, setRate] = useState(interestRate || 0.02); // Default to 2%
  const [months, setMonths] = useState(60); // Default to 5 years
  const [monthlyDeposit, setMonthlyDeposit] = useState(100);
  const [compoundingFrequency, setCompoundingFrequency] = useState<CompoundingFrequency>('monthly');
  
  // State for projection data
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [totalInterest, setTotalInterest] = useState(0);
  const [finalBalance, setFinalBalance] = useState(0);
  
  // Calculate projections when inputs change
  useEffect(() => {
    // Generate projection data
    const projection = generateSavingsProjection(
      balance,
      rate,
      months,
      compoundingFrequency,
      monthlyDeposit
    );
    
    // Calculate total interest
    const { interestEarned, finalBalance } = calculateSavingsInterest(
      balance,
      rate,
      months,
      compoundingFrequency,
      monthlyDeposit
    );
    
    // Format data for chart
    const chartData = projection.map((item, index) => ({
      month: index,
      balance: item.balance,
      deposits: item.totalDeposits,
      interest: item.totalInterest,
    }));
    
    setProjectionData(chartData);
    setTotalInterest(interestEarned);
    setFinalBalance(finalBalance);
  }, [balance, rate, months, compoundingFrequency, monthlyDeposit]);
  
  // Format tooltip values for chart
  const formatTooltip = (value: number, name: string) => {
    return [formatCurrency(value), name];
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="initial-balance">Initial Balance</Label>
            <Input
              id="initial-balance"
              type="number"
              value={balance}
              onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="interest-rate">Interest Rate (%)</Label>
            <Input
              id="interest-rate"
              type="number"
              value={rate * 100}
              onChange={(e) => setRate(parseFloat(e.target.value) / 100 || 0)}
              step="0.01"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="monthly-deposit">Monthly Deposit</Label>
            <Input
              id="monthly-deposit"
              type="number"
              value={monthlyDeposit}
              onChange={(e) => setMonthlyDeposit(parseFloat(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>Time Period: {Math.floor(months / 12)} years {months % 12} months</Label>
            <Slider
              value={[months]}
              min={1}
              max={360} // Max 30 years
              step={1}
              onValueChange={(value) => setMonths(value[0])}
              className="mt-2"
            />
          </div>
          
          <div>
            <Label htmlFor="compounding">Compounding Frequency</Label>
            <Select
              value={compoundingFrequency}
              onValueChange={(value) => setCompoundingFrequency(value as CompoundingFrequency)}
            >
              <SelectTrigger id="compounding" className="mt-1">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <h3 className="text-sm font-medium text-muted-foreground">Total Interest</h3>
                <p className="text-2xl font-bold">{formatCurrency(totalInterest)}</p>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-muted-foreground">Final Balance</h3>
                <p className="text-2xl font-bold">{formatCurrency(finalBalance)}</p>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-muted-foreground">Total Deposits</h3>
                <p className="text-xl font-semibold">{formatCurrency(balance + (monthlyDeposit * months))}</p>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-muted-foreground">Return on Investment</h3>
                <p className="text-xl font-semibold">
                  {((totalInterest / (balance + (monthlyDeposit * months))) * 100).toFixed(2)}%
                </p>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground mt-2">
              * Calculation based on {compoundingFrequency} compounding at {(rate * 100).toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="chart" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chart">Growth Chart</TabsTrigger>
          <TabsTrigger value="table">Detailed Projection</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart" className="pt-4">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={projectionData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  label={{ value: 'Months', position: 'insideBottomRight', offset: -5 }} 
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value, 0)} 
                  label={{ value: 'Balance', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip 
                  formatter={formatTooltip} 
                  labelFormatter={(label) => `Month ${label}`} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  name="Total Balance" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="deposits" 
                  name="Total Deposits" 
                  stroke="#82ca9d" 
                />
                <Line 
                  type="monotone" 
                  dataKey="interest" 
                  name="Total Interest" 
                  stroke="#ffc658" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
        
        <TabsContent value="table" className="pt-4">
          <div className="border rounded-md max-h-80 overflow-auto">
            <Table>
              <TableCaption>Projected Growth Over {Math.floor(months / 12)} Years {months % 12} Months</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Monthly Interest</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead>Total Interest</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectionData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{index}</TableCell>
                    <TableCell>
                      {formatCurrency(index > 0 
                        ? row.interest - projectionData[index - 1].interest 
                        : row.interest)}
                    </TableCell>
                    <TableCell>{formatCurrency(monthlyDeposit)}</TableCell>
                    <TableCell>{formatCurrency(row.interest)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(row.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}