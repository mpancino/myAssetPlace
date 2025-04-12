import { useState } from "react";
import { BalanceHistoryEntry } from "@shared/schema";
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
    balance: initialBalance
  });

  // Add a new balance entry
  const addBalanceEntry = () => {
    if (!newEntry.balance) {
      toast({
        title: "Missing balance",
        description: "Please enter a balance amount",
        variant: "destructive",
      });
      return;
    }
    
    const entry = {
      ...newEntry,
      id: uuidv4(),
      date: newEntry.date || new Date(),
      balance: newEntry.balance
    } as BalanceHistoryEntry;
    
    // Sort history by date (newest first)
    const updatedHistory = [...balanceHistory, entry].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    onChange(updatedHistory);
    
    // Reset form with current balance as default
    setNewEntry({
      id: uuidv4(),
      date: new Date(),
      balance: newEntry.balance // Keep same balance for convenience
    });
  };

  // Remove a balance entry
  const removeBalanceEntry = (id: string) => {
    onChange(balanceHistory.filter(entry => entry.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="entry-date">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="entry-date"
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
          <Label htmlFor="entry-balance">Balance</Label>
          <Input
            id="entry-balance"
            type="number"
            step="0.01"
            value={newEntry.balance || ''}
            onChange={(e) => setNewEntry({ 
              ...newEntry, 
              balance: e.target.value ? parseFloat(e.target.value) : undefined 
            })}
            placeholder="Current balance amount"
          />
        </div>

        <div className="md:col-span-2">
          <Button
            type="button"
            onClick={addBalanceEntry}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Balance Entry
          </Button>
        </div>
      </div>

      {balanceHistory.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-3 gap-2 font-medium text-sm">
            <div>Date</div>
            <div>Balance</div>
            <div></div>
          </div>
          
          {balanceHistory.map((entry) => (
            <div key={entry.id} className="grid grid-cols-3 gap-2 items-center">
              <div>{format(new Date(entry.date), "MMM d, yyyy")}</div>
              <div>${entry.balance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</div>
              <div className="flex justify-end">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeBalanceEntry(entry.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}