import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Asset } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { X, Link, PiggyBank } from "lucide-react";

interface OffsetAccountSectionProps {
  loanId: number;
  loanInterestRate?: number;
}

export function OffsetAccountSection({
  loanId,
  loanInterestRate = 0,
}: OffsetAccountSectionProps) {
  const { toast } = useToast();
  const [selectedCashAccountId, setSelectedCashAccountId] = useState<string>("");

  // Fetch all cash accounts that are not already offset accounts
  const { data: availableCashAccounts = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
    select: (assets) =>
      assets.filter(
        (asset) =>
          asset.assetClassId === 1 && // Cash account
          !asset.isOffsetAccount && // Not already an offset account
          !asset.isLiability // Not a liability
      ),
  });

  // Fetch offset accounts linked to this loan
  const { data: offsetAccounts = [], isLoading: offsetAccountsLoading } = useQuery<Asset[]>({
    queryKey: [`/api/loans/${loanId}/offset-accounts`],
    enabled: !!loanId,
  });

  // Calculate total offset account value
  const totalOffsetValue = offsetAccounts.reduce(
    (total, account) => total + account.value,
    0
  );
  
  // Calculate potential interest savings
  const annualSavings = totalOffsetValue * (loanInterestRate / 100);

  // Link a cash account as an offset account
  const linkOffsetMutation = useMutation({
    mutationFn: async ({ cashAccountId, loanId }: { cashAccountId: number; loanId: number }) => {
      const res = await apiRequest("POST", "/api/assets/offset-link", {
        cashAccountId,
        loanId,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Offset Account Linked",
        description: "The cash account has been linked as an offset account.",
      });
      // Reset selection
      setSelectedCashAccountId("");
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: [`/api/loans/${loanId}/offset-accounts`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Linking Offset Account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unlink an offset account
  const unlinkOffsetMutation = useMutation({
    mutationFn: async (cashAccountId: number) => {
      const res = await apiRequest("POST", "/api/assets/offset-unlink", {
        cashAccountId,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Offset Account Unlinked",
        description: "The offset account has been unlinked.",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: [`/api/loans/${loanId}/offset-accounts`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Unlinking Offset Account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLinkOffsetAccount = () => {
    if (!selectedCashAccountId) return;
    
    linkOffsetMutation.mutate({
      cashAccountId: parseInt(selectedCashAccountId),
      loanId,
    });
  };

  const handleUnlinkOffsetAccount = (cashAccountId: number) => {
    unlinkOffsetMutation.mutate(cashAccountId);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Link className="h-5 w-5 mr-2" />
          Offset Accounts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Total Offset Value</div>
              <div className="text-xl font-bold">{formatCurrency(totalOffsetValue)}</div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Potential Annual Savings</div>
              <div className="text-xl font-bold">{formatCurrency(annualSavings)}</div>
            </div>
          </div>

          {/* List of current offset accounts */}
          {offsetAccounts.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Linked Offset Accounts</h3>
              <div className="space-y-2">
                {offsetAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between bg-card rounded-lg border p-3"
                  >
                    <div className="flex items-center">
                      <PiggyBank className="h-4 w-4 mr-2 text-primary" />
                      <div>
                        <div className="font-medium">{account.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(account.value)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkOffsetAccount(account.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              No offset accounts linked to this loan.
            </div>
          )}

          {/* Add new offset account */}
          {availableCashAccounts.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <h3 className="text-sm font-medium">Link New Offset Account</h3>
              <div className="flex items-end gap-2">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="cash-account">Select Cash Account</Label>
                  <Select
                    value={selectedCashAccountId}
                    onValueChange={setSelectedCashAccountId}
                  >
                    <SelectTrigger id="cash-account">
                      <SelectValue placeholder="Select a cash account" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCashAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name} ({formatCurrency(account.value)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleLinkOffsetAccount}
                  disabled={!selectedCashAccountId || linkOffsetMutation.isPending}
                >
                  {linkOffsetMutation.isPending ? "Linking..." : "Link Account"}
                </Button>
              </div>
            </div>
          )}

          {/* Information about offset accounts */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p>
              <strong>What are offset accounts?</strong> Offset accounts are cash accounts that are linked
              to your loan. The balance in these accounts is offset against your loan balance when
              calculating interest, potentially saving you money.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}