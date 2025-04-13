import { useState } from "react";
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
    frankedAmount: 0,
    notes: ""
  });

  // Add a new dividend entry
  const addDividendEntry = () => {
    if (!newEntry.amount) {
      toast({
        title: "Missing amount",
        description: "Please enter a dividend amount",
        variant: "destructive",
      });
      return;
    }
    
    const entry = {
      ...newEntry,
      id: uuidv4(),
      date: newEntry.date || new Date(),
      amount: newEntry.amount,
      frankedAmount: newEntry.frankedAmount || 0,
      notes: newEntry.notes || ""
    } as DividendTransaction;
    
    // Sort history by date (newest first)
    const updatedHistory = [...dividendHistory, entry].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    onChange(updatedHistory);
    
    // Calculate and update dividend yield if callback provided
    if (onYieldChange && currentPrice > 0 && sharesQuantity > 0) {
      // Calculate annual dividend based on history
      // This is a simplification - in reality would need to analyze frequency
      const totalDividend = updatedHistory.reduce((sum, entry) => sum + entry.amount, 0);
      const annualYield = (totalDividend / (currentPrice * sharesQuantity)) * 100;
      onYieldChange(annualYield);
    }
    
    // Reset form but keep date for convenience
    setNewEntry({
      id: uuidv4(),
      date: newEntry.date,
      amount: 0,
      frankedAmount: 0,
      notes: ""
    });
  };

  // Remove a dividend entry
  const removeDividendEntry = (id: string) => {
    const updatedHistory = dividendHistory.filter(entry => entry.id !== id);
    onChange(updatedHistory);
    
    // Update dividend yield if callback provided
    if (onYieldChange && currentPrice > 0 && sharesQuantity > 0) {
      const totalDividend = updatedHistory.reduce((sum, entry) => sum + entry.amount, 0);
      const annualYield = (totalDividend / (currentPrice * sharesQuantity)) * 100;
      onYieldChange(annualYield);
    }
  };

  // Calculate totals
  const totalDividend = dividendHistory.reduce((sum, entry) => sum + entry.amount, 0);
  const totalFranked = dividendHistory.reduce((sum, entry) => sum + (entry.frankedAmount || 0), 0);
  const averagePerShare = sharesQuantity > 0 ? totalDividend / sharesQuantity : 0;

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
          <Label htmlFor="dividend-amount">Amount</Label>
          <Input
            id="dividend-amount"
            type="number"
            step="0.01"
            value={newEntry.amount || ''}
            onChange={(e) => setNewEntry({ 
              ...newEntry, 
              amount: e.target.value ? parseFloat(e.target.value) : undefined 
            })}
            placeholder="Dividend amount"
          />
        </div>

        <div>
          <Label htmlFor="dividend-franked">Franked Amount</Label>
          <Input
            id="dividend-franked"
            type="number"
            step="0.01"
            value={newEntry.frankedAmount || ''}
            onChange={(e) => setNewEntry({ 
              ...newEntry, 
              frankedAmount: e.target.value ? parseFloat(e.target.value) : 0
            })}
            placeholder="Franked portion (optional)"
          />
        </div>

        <div>
          <Label htmlFor="dividend-notes">Notes</Label>
          <Input
            id="dividend-notes"
            value={newEntry.notes || ''}
            onChange={(e) => setNewEntry({ 
              ...newEntry, 
              notes: e.target.value
            })}
            placeholder="Optional notes"
          />
        </div>

        <div className="md:col-span-2">
          <Button
            type="button"
            onClick={addDividendEntry}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Dividend Payment
          </Button>
        </div>
      </div>

      {dividendHistory.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-4 gap-2 font-medium text-sm">
            <div>Date</div>
            <div>Amount</div>
            <div>Franked</div>
            <div></div>
          </div>
          
          {dividendHistory.map((entry) => (
            <div key={entry.id} className="grid grid-cols-4 gap-2 items-center">
              <div>{format(new Date(entry.date), "MMM d, yyyy")}</div>
              <div>${entry.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</div>
              <div>${(entry.frankedAmount || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</div>
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
          
          <div className="grid grid-cols-4 gap-2 items-center pt-4 border-t">
            <div className="font-medium">Totals:</div>
            <div className="font-medium">${totalDividend.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</div>
            <div className="font-medium">${totalFranked.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</div>
            <div></div>
          </div>
          
          <div className="grid grid-cols-4 gap-2 items-center pt-1">
            <div className="font-medium">Per Share:</div>
            <div className="font-medium">${averagePerShare.toLocaleString(undefined, {
              minimumFractionDigits: 4,
              maximumFractionDigits: 4
            })}</div>
            <div></div>
            <div></div>
          </div>
        </div>
      )}
    </div>
  );
}