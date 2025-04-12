import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { PropertyForm } from "@/components/property/property-form";
import { InsertProperty } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AddPropertyPage() {
  const [location, setLocation] = useLocation();
  const params = useParams();
  const assetClassId = params.classId ? parseInt(params.classId) : undefined;
  const { toast } = useToast();
  
  // Add property mutation
  const addPropertyMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      const res = await apiRequest("POST", "/api/assets", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Property Added",
        description: "Your property has been added successfully.",
      });
      // Invalidate queries to refresh asset data
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets/by-class"] });
      
      // Navigate back
      if (assetClassId) {
        setLocation(`/asset-classes/${assetClassId}`);
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add property: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = (data: InsertProperty) => {
    addPropertyMutation.mutate(data);
  };

  // Handle navigate back
  const handleBack = () => {
    if (assetClassId) {
      setLocation(`/asset-classes/${assetClassId}`);
    } else {
      setLocation("/dashboard");
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Add New Property</h1>
        </div>

        {addPropertyMutation.isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              There was a problem adding your property. Please try again.
            </AlertDescription>
          </Alert>
        )}

        <PropertyForm 
          onSubmit={handleSubmit} 
          isSubmitting={addPropertyMutation.isPending}
          assetClassId={assetClassId}
        />
      </div>
    </MainLayout>
  );
}