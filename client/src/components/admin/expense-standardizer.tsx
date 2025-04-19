/**
 * Admin tool for standardizing expense data across the application
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function ExpenseStandardizer() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const runStandardization = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await apiRequest("GET", "/api/admin/standardize-expenses");
      const data = await response.json();
      
      setResult(data);
      
      if (data.success) {
        toast({
          title: "Standardization Complete",
          description: `Successfully standardized expenses for ${data.result.updatedCount} assets.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Standardization Failed",
          description: data.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error standardizing expenses:", error);
      toast({
        title: "Standardization Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setResult({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const runCategoryStandardization = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await apiRequest("POST", "/api/admin/standardize-expense-categories");
      const data = await response.json();
      
      setResult(data);
      
      if (data.success) {
        toast({
          title: "Category Standardization Complete",
          description: `Successfully standardized expense categories for ${data.updatedCount} asset classes.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Category Standardization Failed",
          description: data.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error standardizing expense categories:", error);
      toast({
        title: "Category Standardization Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setResult({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Expense Data Standardization
          {result && (
            <Badge className={result.success ? "bg-green-600" : "bg-red-600"}>
              {result.success ? "Success" : "Failed"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Standardize all expense data across the application to a consistent format.
          This process ensures that expense data is stored consistently and can be used
          by all features of the application.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="text-sm font-semibold">Step 1: Standardize Categories</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              First, standardize all expense categories to ensure consistent format.
            </p>
            <Button 
              onClick={runCategoryStandardization} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Categories...
                </>
              ) : "Standardize Categories"}
            </Button>
          </div>
          
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="text-sm font-semibold">Step 2: Standardize Expense Data</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Then, standardize all expense data using the standardized categories.
            </p>
            <Button 
              onClick={runStandardization} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Expenses...
                </>
              ) : "Standardize All Expenses"}
            </Button>
          </div>
        </div>
        
        {result && (
          <div className={`mt-4 p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              )}
              <div>
                <h4 className="font-medium">
                  {result.success ? 'Standardization Complete' : 'Standardization Failed'}
                </h4>
                <p className="text-sm mt-1">
                  {result.message || (result.success ? 'All expenses have been standardized.' : 'An error occurred during standardization.')}
                </p>
                
                {result.success && result.result && (
                  <div className="mt-2">
                    <p className="text-xs font-medium">Updated Assets: {result.result.updatedCount}</p>
                  </div>
                )}
                
                {!result.success && result.error && (
                  <p className="text-xs text-red-600 mt-1">{result.error}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between bg-muted/20 text-xs text-muted-foreground rounded-b-lg">
        <span>Admin tools • Expense Standardization</span>
        <span>{new Date().toLocaleString()}</span>
      </CardFooter>
    </Card>
  );
}