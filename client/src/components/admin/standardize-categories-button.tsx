import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function StandardizeCategoriesButton() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    standardizedCount?: number;
    unchangedCount?: number;
    totalProcessed?: number;
    error?: string;
  } | null>(null);

  const standardizeCategories = async () => {
    try {
      setIsRunning(true);
      setResult(null);

      const response = await apiRequest("POST", "/api/admin/standardize-expense-categories");
      const data = await response.json();
      
      setResult(data);
      
      if (data.success) {
        toast({
          title: "Categories Standardized",
          description: `Successfully standardized ${data.standardizedCount} asset classes. ${data.unchangedCount} were already in the correct format.`,
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to standardize expense categories",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error standardizing categories:", error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
      
      toast({
        title: "Error",
        description: "Failed to standardize expense categories. Check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4">
        <h3 className="text-lg font-medium">Expense Categories Format</h3>
        <p className="text-sm text-muted-foreground">
          Standardize expense categories across all asset classes to ensure a consistent format.
          This helps prevent errors when generating expenses and ensures proper display in the UI.
        </p>
        
        <Button 
          variant="outline"
          onClick={standardizeCategories}
          disabled={isRunning}
          className="w-full md:w-auto"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Standardizing...
            </>
          ) : (
            "Standardize All Expense Categories"
          )}
        </Button>

        {result && (
          <Alert className={result.success ? "bg-green-50" : "bg-red-50"}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
            </div>
            <AlertDescription className="mt-2">
              {result.success ? (
                <>
                  Successfully processed {result.totalProcessed} asset classes:
                  <ul className="list-disc list-inside mt-2">
                    <li>Standardized: {result.standardizedCount}</li>
                    <li>Already correct format: {result.unchangedCount}</li>
                  </ul>
                </>
              ) : (
                result.message || result.error || "Failed to standardize expense categories"
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}