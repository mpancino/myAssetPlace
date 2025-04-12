import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Check, Loader2 } from "lucide-react";

const ExpenseGeneratorPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    logs?: string[];
  } | null>(null);

  const runUpdateExpenses = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const response = await apiRequest("POST", "/api/run-update-expenses");
      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: "Success!",
          description: data.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Failed to update expenses",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error running update expenses script:", error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });

      toast({
        title: "Error",
        description: "Failed to run the expense update script. Check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Expense Generator</h1>
        <p className="text-muted-foreground mt-2">
          Generate realistic expenses for all your assets based on their asset classes.
        </p>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Update Assets with Expenses</CardTitle>
            <CardDescription>
              This tool will update all your assets with expenses that match the expense categories
              defined in their asset classes. This helps demonstrate the expense tracking features of myAssetPlace.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <AlertDescription className="mt-2">{result.message}</AlertDescription>
              </Alert>
            )}

            {result?.logs && result.logs.length > 0 && (
              <div className="mt-4 rounded-md border bg-slate-50 p-4">
                <h3 className="mb-2 font-medium">Execution log:</h3>
                <div className="max-h-60 overflow-y-auto rounded bg-slate-100 p-2 text-xs font-mono">
                  {result.logs.map((log, index) => (
                    <div key={index} className="py-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={runUpdateExpenses}
              disabled={isRunning}
              size="lg"
              className="w-full sm:w-auto"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                "Run Expense Generator"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ExpenseGeneratorPage;