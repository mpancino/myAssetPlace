import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { 
  AssetClass,
  AssetHoldingType,
  ProjectionConfig
} from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function ProjectionsAssetFilterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Fetch default projection config
  const { 
    data: defaultConfig, 
    isLoading: configLoading,
    error: configError
  } = useQuery({
    queryKey: ['/api/projections/config'],
    queryFn: async () => {
      const res = await fetch('/api/projections/config');
      if (!res.ok) throw new Error('Failed to load default configuration');
      return res.json();
    }
  });
  
  // Fetch asset classes
  const { 
    data: assetClasses = [], 
    isLoading: classesLoading
  } = useQuery<AssetClass[]>({
    queryKey: ['/api/asset-classes'],
    enabled: !!user
  });
  
  // Fetch holding types
  const { 
    data: holdingTypes = [], 
    isLoading: typesLoading
  } = useQuery<AssetHoldingType[]>({
    queryKey: ['/api/asset-holding-types'],
    enabled: !!user
  });
  
  // State for filter settings
  const [config, setConfig] = useState<ProjectionConfig | null>(null);
  const [selectedAssetClasses, setSelectedAssetClasses] = useState<number[]>([]);
  const [selectedHoldingTypes, setSelectedHoldingTypes] = useState<number[]>([]);
  
  // Update local state when data is loaded
  useEffect(() => {
    if (defaultConfig) {
      setConfig(defaultConfig);
      
      // Initialize selections from config if available
      if (defaultConfig.enabledAssetClasses && defaultConfig.enabledAssetClasses.length > 0) {
        setSelectedAssetClasses(defaultConfig.enabledAssetClasses);
      } else if (assetClasses && assetClasses.length > 0) {
        // Otherwise select all by default
        setSelectedAssetClasses(assetClasses.map(ac => ac.id));
      }
      
      if (defaultConfig.enabledAssetHoldingTypes && defaultConfig.enabledAssetHoldingTypes.length > 0) {
        setSelectedHoldingTypes(defaultConfig.enabledAssetHoldingTypes);
      } else if (holdingTypes && holdingTypes.length > 0) {
        // Otherwise select all by default
        setSelectedHoldingTypes(holdingTypes.map(ht => ht.id));
      }
    }
  }, [defaultConfig, assetClasses, holdingTypes]);
  
  // Toggle asset class selection
  const toggleAssetClass = (id: number) => {
    setSelectedAssetClasses(prev => {
      if (prev.includes(id)) {
        return prev.filter(classId => classId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  // Toggle holding type selection
  const toggleHoldingType = (id: number) => {
    setSelectedHoldingTypes(prev => {
      if (prev.includes(id)) {
        return prev.filter(typeId => typeId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  // Select all asset classes
  const selectAllAssetClasses = () => {
    setSelectedAssetClasses(assetClasses.map(ac => ac.id));
  };
  
  // Select all holding types
  const selectAllHoldingTypes = () => {
    setSelectedHoldingTypes(holdingTypes.map(ht => ht.id));
  };
  
  // Clear all asset classes
  const clearAssetClasses = () => {
    setSelectedAssetClasses([]);
  };
  
  // Clear all holding types
  const clearHoldingTypes = () => {
    setSelectedHoldingTypes([]);
  };
  
  // Save filter settings and go back to projections page
  const saveAndReturn = () => {
    if (!config) return;
    
    // Update local storage with settings
    const updatedConfig = {
      ...config,
      enabledAssetClasses: selectedAssetClasses,
      enabledAssetHoldingTypes: selectedHoldingTypes
    };
    
    // Update the query cache with the new config
    queryClient.setQueryData(['/api/projections/config'], updatedConfig);
    
    toast({
      title: "Filters Saved",
      description: "Your asset filter settings have been saved."
    });
    
    // Navigate back to projections page
    navigate('/projections');
  };
  
  if (configLoading || classesLoading || typesLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          <span className="ml-2">Loading asset filters...</span>
        </div>
      </div>
    );
  }
  
  if (configError || !config) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-red-500 mb-4">Failed to load projection configuration</div>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/projections/config'] })}>
            Retry
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Projection Asset Filters</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/projections')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button 
            size="sm"
            onClick={saveAndReturn}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Filters
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Classes Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Asset Classes</CardTitle>
                <CardDescription>Select which asset classes to include in projections</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={selectAllAssetClasses}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearAssetClasses}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assetClasses.map(assetClass => (
                <div key={assetClass.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`asset-class-${assetClass.id}`} 
                    checked={selectedAssetClasses.includes(assetClass.id)}
                    onCheckedChange={() => toggleAssetClass(assetClass.id)}
                  />
                  <Label 
                    htmlFor={`asset-class-${assetClass.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    {assetClass.name}
                  </Label>
                </div>
              ))}
              
              {assetClasses.length === 0 && (
                <p className="text-muted-foreground">No asset classes found.</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Holding Types Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Asset Holding Types</CardTitle>
                <CardDescription>Select which holding types to include</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={selectAllHoldingTypes}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearHoldingTypes}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {holdingTypes.map(holdingType => (
                <div key={holdingType.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`holding-type-${holdingType.id}`} 
                    checked={selectedHoldingTypes.includes(holdingType.id)}
                    onCheckedChange={() => toggleHoldingType(holdingType.id)}
                  />
                  <Label 
                    htmlFor={`holding-type-${holdingType.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    {holdingType.name}
                  </Label>
                </div>
              ))}
              
              {holdingTypes.length === 0 && (
                <p className="text-muted-foreground">No holding types found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8 bg-muted p-4 rounded-lg">
        <div className="flex items-center mb-2">
          <Filter className="h-5 w-5 text-muted-foreground mr-2" />
          <h3 className="font-semibold">Filter Settings</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          These filters will be applied when generating projections. Only the selected asset classes and holding types will be included in calculations.
        </p>
        <Separator className="my-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">Selected Asset Classes: </span>
            <span>{selectedAssetClasses.length} of {assetClasses.length}</span>
          </div>
          <div>
            <span className="font-medium">Selected Holding Types: </span>
            <span>{selectedHoldingTypes.length} of {holdingTypes.length}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <Button 
          onClick={saveAndReturn}
          className="px-6"
        >
          <Save className="w-4 h-4 mr-2" />
          Save and Return to Projections
        </Button>
      </div>
    </div>
  );
}