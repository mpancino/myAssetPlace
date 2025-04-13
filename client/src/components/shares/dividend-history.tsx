import { useState, useEffect } from "react";
import { DividendTransaction } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, CalendarIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DividendHistoryProps {
  dividendHistory: DividendTransaction[];
  onChange: (history: DividendTransaction[]) => void;
  sharesQuantity?: number;
  onYieldChange?: (annualYield: number) => void;
  currentPrice?: number;
}

export function DividendHistory({
  dividendHistory = [],
  onChange,
  sharesQuantity = 0,
  onYieldChange,
  currentPrice = 0
}: DividendHistoryProps) {
  const { toast } = useToast();
  const [newEntry, setNewEntry] = useState<Partial<DividendTransaction>>({
    id: uuidv4(),
    date: new Date(),
    amount: 0,
    frequency: "quarterly",
    notes: ""
  });

  // Add a new dividend entry
  const addDividendEntry = () => {
    if (!newEntry.amount) {
      toast({
        title: "Incomplete data",
        description: "Please enter the dividend amount",
        variant: "destructive",
      });
      return;
    }
    
    const entry = {
      ...newEntry,
      id: uuidv4(),
      date: newEntry.date || new Date(),
      amount: newEntry.amount,
      frequency: newEntry.frequency || "quarterly",
      notes: newEntry.notes || ""
    } as DividendTransaction;
    
    // Sort history by date (newest first)
    const updatedHistory = [...dividendHistory, entry].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    onChange(updatedHistory);
    
    // Reset form but keep date and frequency for convenience
    setNewEntry({
      id: uuidv4(),
      date: newEntry.date,
      amount: 0,
      frequency: newEntry.frequency,
      notes: ""
    });
  };

  // Remove a dividend entry
  const removeDividendEntry = (id: string) => {
    const updatedHistory = dividendHistory.filter(entry => entry.id !== id);
    onChange(updatedHistory);
  };

  // Calculate annual dividend yield
  useEffect(() => {
    if (onYieldChange && currentPrice > 0 && sharesQuantity > 0) {
      // Get most recent dividend entry
      const latestDividend = dividendHistory.length > 0 
        ? dividendHistory.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0]
        : null;
      
      if (latestDividend) {
        // Calculate annual dividend based on frequency
        let annualAmount = latestDividend.amount;
        
        switch (latestDividend.frequency) {
          case "monthly":
            annualAmount *= 12;
            break;
          case "quarterly":
            annualAmount *= 4;
            break;
          case "semi-annual":
            annualAmount *= 2;
            break;
          // annual is already correct
        }
        
        // Calculate annual yield percentage: (annual dividend per share / share price) * 100
        const dividendPerShare = latestDividend.amount / sharesQuantity;
        const annualDividendPerShare = dividendPerShare * 
          (latestDividend.frequency === "monthly" ? 12 : 
           latestDividend.frequency === "quarterly" ? 4 : 
           latestDividend.frequency === "semi-annual" ? 2 : 1);
        
        const yield_ = (annualDividendPerShare / currentPrice) * 100;
        onYieldChange(parseFloat(yield_.toFixed(2)));
      }
    }
  }, [dividendHistory, sharesQuantity, currentPrice, onYieldChange]);

  // Calculate total annual dividend income
  const calculateAnnualDividendIncome = () => {
    if (dividendHistory.length === 0) return 0;
    
    // Get latest dividend
    const latestDividend = dividendHistory.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    
    // Calculate annual dividend based on frequency
    let factor = 1;
    switch (latestDividend.frequency) {
      case "monthly": factor = 12; break;
      case "quarterly": factor = 4; break;
      case "semi-annual": factor = 2; break;
      // annual is already correct
    }
    
    return latestDividend.amount * factor;
  };

  const annualDividendIncome = calculateAnnualDividendIncome();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dividend-date">Payment Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="dividend-date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !newEntry.date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {newEntry.date ? (
                  format(newEntry.date, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newEntry.date}
                onSelect={(date) => 
                  setNewEntry({ ...newEntry, date: date || new Date() })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="dividend-amount">Total Amount</Label>
          <Input
            id="dividend-amount"
            type="number"
            step="0.01"
            value={newEntry.amount || ''}
            onChange={(e) => setNewEntry({ 
              ...newEntry, 
              amount: e.target.value ? parseFloat(e.target.value) : undefined 
            })}
            placeholder="Total dividend payment"
          />
        </div>

        <div>
          <Label htmlFor="dividend-frequency">Frequency</Label>
          <Select
            value={newEntry.frequency || "quarterly"}
            onValueChange={(value) => 
              setNewEntry({ ...newEntry, frequency: value as "annual" | "semi-annual" | "quarterly" | "monthly" })
            }
          >
            <SelectTrigger id="dividend-frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="semi-annual">Semi-Annual</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="dividend-notes">Notes</Label>
          <Input
            id="dividend-notes"
            value={newEntry.notes || ''}
            onChange={(e) => setNewEntry({ 
              ...newEntry, 
              notes: e.target.value
            })}
            placeholder="Optional notes about this dividend"
          />
        </div>

        <div className="md:col-span-2">
          <Button
            type="button"
            onClick={addDividendEntry}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Dividend Entry
          </Button>
        </div>
      </div>

      {dividendHistory.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-4 gap-2 font-medium text-sm">
            <div>Date</div>
            <div>Amount</div>
            <div>Frequency</div>
            <div></div>
          </div>
          
          {dividendHistory.map((entry) => (
            <div key={entry.id} className="grid grid-cols-4 gap-2 items-center">
              <div>{format(new Date(entry.date), "MMM d, yyyy")}</div>
              <div>${entry.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</div>
              <div className="capitalize">{entry.frequency}</div>
              <div className="flex justify-end">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeDividendEntry(entry.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {annualDividendIncome > 0 && (
            <div className="grid grid-cols-4 gap-2 items-center pt-4 border-t">
              <div className="font-medium">Annual Income:</div>
              <div className="font-medium">${annualDividendIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</div>
              <div></div>
              <div></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}