import { Asset, AssetHoldingType } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MapPin, Home, Building, DollarSign, BedDouble, Bath, Car, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { type PropertyExpense } from "./property-expenses";
import { calculateLoanPayment } from "@shared/calculations";

interface PropertyCardProps {
  property: Asset;
  holdingType?: AssetHoldingType;
  onDelete?: () => void;
  showActions?: boolean;
}

export function PropertyCard({
  property,
  holdingType,
  onDelete,
  showActions = true,
}: PropertyCardProps) {
  const [, setLocation] = useLocation();
  
  // Determine if property is a rental
  const isRental = !!property.isRental;
  
  // Handle possible snake_case vs camelCase inconsistency
  const hasMortgage = property.hasMortgage || (property as any).has_mortgage;
  const mortgageAmount = property.mortgageAmount || (property as any).mortgage_amount;
  
  // Format rental income to monthly basis
  const formatRentalIncome = () => {
    if (!property.rentalIncome) return "N/A";
    
    if (property.rentalFrequency === "weekly") {
      return `${formatCurrency(property.rentalIncome * 4.33)} /month (${formatCurrency(property.rentalIncome)} /week)`;
    } else if (property.rentalFrequency === "fortnightly") {
      return `${formatCurrency(property.rentalIncome * 2.17)} /month (${formatCurrency(property.rentalIncome)} /fortnight)`;
    } else {
      return `${formatCurrency(property.rentalIncome)} /month`;
    }
  };

  // Navigate to property details
  const viewDetails = () => {
    setLocation(`/assets/${property.id}`);
  };

  // Get property type label
  const getPropertyTypeLabel = (type: string | null | undefined) => {
    if (!type) return "Unknown";
    
    const typeMap: Record<string, string> = {
      residential: "Residential",
      commercial: "Commercial",
      industrial: "Industrial",
      land: "Land",
      rural: "Rural",
      other: "Other"
    };
    
    return typeMap[type] || "Unknown";
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex items-center">
            <Home className="h-4 w-4 mr-2 text-muted-foreground" />
            {property.name}
          </CardTitle>
          <div className="flex flex-col items-end gap-1">
            {holdingType && (
              <Badge variant="outline">{holdingType.name}</Badge>
            )}
            {hasMortgage && (
              <Badge variant="outline" className="bg-primary/10 text-primary">
                <CreditCard className="h-3 w-3 mr-1" /> Has Mortgage
              </Badge>
            )}
          </div>
        </div>
        {property.address && (
          <div className="text-sm text-muted-foreground flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            {property.address}, {property.suburb}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="text-sm text-muted-foreground">Current Value</div>
            <div className="font-medium">{formatCurrency(property.value)}</div>
          </div>
          
          {/* Show mortgage details if property has a mortgage */}
          {hasMortgage && (
            <>
              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground flex items-center">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Mortgage Balance
                </div>
                <div className="font-medium text-destructive">
                  {formatCurrency(mortgageAmount || 0)}
                </div>
              </div>
              
              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">Equity</div>
                <div className="font-medium text-green-600">
                  {formatCurrency((property.value || 0) - (mortgageAmount || 0))}
                </div>
              </div>
              
              {/* Equity progress bar */}
              <div className="w-full bg-muted rounded-full h-1.5 dark:bg-gray-700">
                <div 
                  className="bg-green-600 h-1.5 rounded-full"
                  style={{ 
                    width: `${property.value ? 
                      Math.min(100, 100 - (((mortgageAmount || 0) / property.value) * 100)) : 0}%` 
                  }}
                ></div>
              </div>
            </>
          )}
          
          {property.purchasePrice && (
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Purchase Price</div>
              <div className="font-medium">{formatCurrency(property.purchasePrice)}</div>
            </div>
          )}
          
          <div className="flex justify-between">
            <div className="text-sm text-muted-foreground">Type</div>
            <div className="font-medium">{getPropertyTypeLabel(property.propertyType)}</div>
          </div>
          
          {isRental && (
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Rental Income</div>
              <div className="font-medium">{formatRentalIncome()}</div>
            </div>
          )}
          
          {/* Display total property expenses if they exist */}
          {property.propertyExpenses && Object.keys(property.propertyExpenses).length > 0 && (
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Annual Expenses</div>
              <div className="font-medium">
                {formatCurrency(Object.values(property.propertyExpenses as Record<string, PropertyExpense>)
                  .reduce((sum, expense) => sum + (expense.annualTotal || 0), 0)
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
            {property.bedrooms && property.bedrooms > 0 && (
              <div className="flex items-center">
                <BedDouble className="h-3 w-3 mr-1" />
                <span>{property.bedrooms}</span>
              </div>
            )}
            
            {property.bathrooms && property.bathrooms > 0 && (
              <div className="flex items-center">
                <Bath className="h-3 w-3 mr-1" />
                <span>{property.bathrooms}</span>
              </div>
            )}
            
            {property.parkingSpaces && property.parkingSpaces > 0 && (
              <div className="flex items-center">
                <Car className="h-3 w-3 mr-1" />
                <span>{property.parkingSpaces}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      {showActions && (
        <CardFooter className="pt-2 flex justify-end space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={viewDetails}
          >
            View Details
          </Button>
          {onDelete && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}