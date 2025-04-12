import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, AlertTriangle, Wrench, CheckCircle2 } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export default function StandardizeCategoriesButton() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<{
    success?: boolean;
    standardizedCount?: number;
    unchangedCount?: number;
    totalProcessed?: number;
    error?: string;
  } | null>(null);

  const standardizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/standardize-expense-categories");
      return await res.json();
    },
    onSuccess: (data) => {
      // Set the result state
      setResult(data);
      
      // Show success toast
      toast({
        title: "Expense Categories Standardized",
        description: `Successfully standardized ${data.standardizedCount} asset classes.`,
        variant: "default",
      });
      
      // Invalidate asset classes to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/asset-classes"] });
    },
    onError: (error: Error) => {
      setResult({ error: error.message, success: false });
      toast({
        title: "Standardization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStandardize = () => {
    // Reset previous results
    setResult(null);
    // Run the standardization
    standardizeMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <h4 className="text-sm font-medium">Expense Category Standardization</h4>
        <p className="text-sm text-muted-foreground">
          Standardize expense categories across all asset classes to ensure consistent format and structure.
        </p>
        <div className="mt-2">
          <Button
            onClick={handleStandardize}
            disabled={standardizeMutation.isPending}
            className="gap-2"
            variant="default"
          >
            {standardizeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Standardizing...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4" />
                Standardize Expense Categories
              </>
            )}
          </Button>
        </div>
      </div>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 mt-0.5" />
            )}
            <div>
              <AlertTitle>
                {result.success
                  ? "Standardization Complete"
                  : "Standardization Failed"}
              </AlertTitle>
              <AlertDescription>
                {result.success ? (
                  <div className="space-y-1 mt-1 text-sm">
                    <p>Total asset classes processed: {result.totalProcessed}</p>
                    <p>Asset classes standardized: {result.standardizedCount}</p>
                    <p>Asset classes already in standard format: {result.unchangedCount}</p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm">{result.error || "An unknown error occurred"}</p>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}