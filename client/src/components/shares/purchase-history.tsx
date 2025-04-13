import { useState } from "react";
import { SharePurchaseTransaction } from "@shared/schema";
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

interface PurchaseHistoryProps {
  purchaseHistory: SharePurchaseTransaction[];
  onChange: (history: SharePurchaseTransaction[]) => void;
  onQuantityChange?: (totalQuantity: number) => void;
}

export function PurchaseHistory({
  purchaseHistory = [],
  onChange,
  onQuantityChange
}: PurchaseHistoryProps) {
  const { toast } = useToast();
  const [newEntry, setNewEntry] = useState<Partial<SharePurchaseTransaction>>({
    id: uuidv4(),
    date: new Date(),
    quantity: 0,
    pricePerShare: 0,
    fees: 0,
    notes: ""
  });

  // Add a new purchase entry
  const addPurchaseEntry = () => {
    if (!newEntry.quantity || !newEntry.pricePerShare) {
      toast({
        title: "Incomplete data",
        description: "Please enter both quantity and price per share",
        variant: "destructive",
      });
      return;
    }
    
    const entry = {
      ...newEntry,
      id: uuidv4(),
      date: newEntry.date || new Date(),
      quantity: newEntry.quantity,
      pricePerShare: newEntry.pricePerShare,
      fees: newEntry.fees || 0,
      notes: newEntry.notes || ""
    } as SharePurchaseTransaction;
    
    // Sort history by date (newest first)
    const updatedHistory = [...purchaseHistory, entry].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    onChange(updatedHistory);
    
    // Update total quantity if callback provided
    if (onQuantityChange) {
      const totalQuantity = updatedHistory.reduce((sum, item) => sum + item.quantity, 0);
      onQuantityChange(totalQuantity);
    }
    
    // Reset form but keep date for convenience
    setNewEntry({
      id: uuidv4(),
      date: newEntry.date,
      quantity: 0,
      pricePerShare: 0,
      fees: 0,
      notes: ""
    });
  };

  // Remove a purchase entry
  const removePurchaseEntry = (id: string) => {
    const updatedHistory = purchaseHistory.filter(entry => entry.id !== id);
    onChange(updatedHistory);
    
    // Update total quantity if callback provided
    if (onQuantityChange) {
      const totalQuantity = updatedHistory.reduce((sum, item) => sum + item.quantity, 0);
      onQuantityChange(totalQuantity);
    }
  };

  // Calculate total shares and average cost
  const totalShares = purchaseHistory.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalCost = purchaseHistory.reduce((sum, entry) => 
    sum + (entry.quantity * entry.pricePerShare) + (entry.fees || 0), 0);
  const averageCost = totalShares > 0 ? totalCost / totalShares : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="entry-date">Purchase Date</Label>
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
          <Label htmlFor="entry-quantity">Quantity</Label>
          <Input
            id="entry-quantity"
            type="number"
            step="0.001"
            value={newEntry.quantity || ''}
            onChange={(e) => setNewEntry({ 
              ...newEntry, 
              quantity: e.target.value ? parseFloat(e.target.value) : undefined 
            })}
            placeholder="Number of shares"
          />
        </div>

        <div>
          <Label htmlFor="entry-price">Price Per Share</Label>
          <Input
            id="entry-price"
            type="number"
            step="0.01"
            value={newEntry.pricePerShare || ''}
            onChange={(e) => setNewEntry({ 
              ...newEntry, 
              pricePerShare: e.target.value ? parseFloat(e.target.value) : undefined 
            })}
            placeholder="Price per share"
          />
        </div>

        <div>
          <Label htmlFor="entry-fees">Fees/Commissions</Label>
          <Input
            id="entry-fees"
            type="number"
            step="0.01"
            value={newEntry.fees || ''}
            onChange={(e) => setNewEntry({ 
              ...newEntry, 
              fees: e.target.value ? parseFloat(e.target.value) : 0
            })}
            placeholder="Optional transaction fees"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="entry-notes">Notes</Label>
          <Input
            id="entry-notes"
            value={newEntry.notes || ''}
            onChange={(e) => setNewEntry({ 
              ...newEntry, 
              notes: e.target.value
            })}
            placeholder="Optional notes about this purchase"
          />
        </div>

        <div className="md:col-span-2">
          <Button
            type="button"
            onClick={addPurchaseEntry}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Purchase Entry
          </Button>
        </div>
      </div>

      {purchaseHistory.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-5 gap-2 font-medium text-sm">
            <div>Date</div>
            <div>Quantity</div>
            <div>Price/Share</div>
            <div>Total Cost</div>
            <div></div>
          </div>
          
          {purchaseHistory.map((entry) => (
            <div key={entry.id} className="grid grid-cols-5 gap-2 items-center">
              <div>{format(new Date(entry.date), "MMM d, yyyy")}</div>
              <div>{entry.quantity.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 3
              })}</div>
              <div>${entry.pricePerShare.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</div>
              <div>${((entry.quantity * entry.pricePerShare) + (entry.fees || 0)).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</div>
              <div className="flex justify-end">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removePurchaseEntry(entry.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          <div className="grid grid-cols-5 gap-2 items-center pt-4 border-t">
            <div className="font-medium">Totals:</div>
            <div className="font-medium">{totalShares.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 3
            })}</div>
            <div className="font-medium">${averageCost.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} avg</div>
            <div className="font-medium">${totalCost.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</div>
            <div></div>
          </div>
        </div>
      )}
    </div>
  );
}