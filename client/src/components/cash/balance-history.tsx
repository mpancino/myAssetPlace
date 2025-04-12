import { useState } from "react";
import { BalanceHistoryEntry } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BalanceHistoryProps {
  balanceHistory: BalanceHistoryEntry[];
  onChange: (history: BalanceHistoryEntry[]) => void;
  initialBalance?: number;
}

export function BalanceHistory({
  balanceHistory = [],
  onChange,
  initialBalance = 0,
}: BalanceHistoryProps) {
  const { toast } = useToast();
  const [newEntry, setNewEntry] = useState<Partial<BalanceHistoryEntry>>({
    id: uuidv4(),
    date: new Date(),
    balance: initialBalance,
    notes: "",
  });

  // Sort balance history by date
  const sortedHistory = [...balanceHistory].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Prepare data for chart
  const chartData = sortedHistory.map(entry => ({
    date: format(new Date(entry.date), "MMM d, yyyy"),
    balance: entry.balance,
  }));

  // Add a new balance history entry
  const addEntry = () => {
    if (!newEntry.date || newEntry.balance === undefined) {
      toast({
        title: "Incomplete data",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    onChange([...balanceHistory, newEntry as BalanceHistoryEntry]);
    setNewEntry({
      id: uuidv4(),
      date: new Date(),
      balance: initialBalance,
      notes: "",
    });
  };

  // Remove a balance history entry
  const removeEntry = (id: string) => {
    onChange(balanceHistory.filter(entry => entry.id !== id));
  };

  return (
    <div className="space-y-6">
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Balance History Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 20,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      
      {sortedHistory.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 font-medium text-sm">
            <div>Date</div>
            <div>Balance</div>
            <div>Notes</div>
            <div></div>
          </div>
          
          {sortedHistory.map((entry) => (
            <div key={entry.id} className="grid grid-cols-4 gap-2 text-sm items-center">
              <div>{format(new Date(entry.date), "MMM d, yyyy")}</div>
              <div>${entry.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div>{entry.notes}</div>
              <div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeEntry(entry.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="balance-date">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="balance-date"
                variant={"outline"}
                className={cn(
                  "w-full pl-3 text-left font-normal",
                  !newEntry.date && "text-muted-foreground"
                )}
              >
                {newEntry.date ? (
                  format(new Date(newEntry.date), "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newEntry.date ? new Date(newEntry.date) : undefined}
                onSelect={(date) => setNewEntry({...newEntry, date})}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="balance-amount">Balance</Label>
          <Input
            id="balance-amount"
            type="number"
            step="0.01"
            value={newEntry.balance || ''}
            onChange={(e) => setNewEntry({...newEntry, balance: parseFloat(e.target.value) || 0})}
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="balance-notes">Notes</Label>
          <Input
            id="balance-notes"
            value={newEntry.notes || ''}
            onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
          />
        </div>

        <div className="col-span-2">
          <Button
            type="button"
            onClick={addEntry}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Balance Entry
          </Button>
        </div>
      </div>
    </div>
  );
}