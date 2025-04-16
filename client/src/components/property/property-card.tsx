import { Asset, AssetHoldingType, Mortgage } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MapPin, Home, Building, DollarSign, BedDouble, Bath, Car, CreditCard, Clock, Calendar, Percent } from "lucide-react";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { calculateMonthlyInterestExpense } from "@/lib/expense-utils";
import { PropertyExpense } from "@shared/schema";
import { calculateLoanPayment } from "@shared/calculations";
import { isLegacyMortgageProperty, asLegacyAsset } from "@/lib/legacy-asset-utils";
import { useQuery } from "@tanstack/react-query";

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
  
  // Fetch mortgages for this property
  const { data: mortgages = [], isLoading: mortgagesLoading } = useQuery<Mortgage[]>({
    queryKey: [`/api/properties/${property.id}/mortgages`],
    enabled: !!property.id,
    // Don't refetch too often
    staleTime: 60 * 1000 // 1 minute
  });
  
  // Get the primary mortgage
  const mortgage = mortgages.length > 0 ? mortgages[0] : null;
  
  // Convert to legacy asset with mortgage properties if needed
  const legacyAsset = asLegacyAsset(property);
  const hasLegacyMortgage = isLegacyMortgageProperty(legacyAsset);
  // Check if we have a mortgage either via the legacy method or through the mortgages API
  const hasMortgage = hasLegacyMortgage || !!mortgage;
  // Get mortgage amount from either source
  const mortgageAmount = mortgage?.value ? Math.abs(mortgage.value) : (legacyAsset?.mortgageAmount || 0);
  // Get mortgage interest rate from either source
  const mortgageInterestRate = mortgage?.interestRate || legacyAsset?.mortgageInterestRate || 0;
  
  // Format rental income to monthly basis
  const formatRentalIncome = (): string => {
    const rentalIncome = property.rentalIncome as number | null | undefined;
    const rentalFrequency = property.rentalFrequency as string | null | undefined;
    
    if (!rentalIncome) return "N/A";
    
    if (rentalFrequency === "weekly") {
      return `${formatCurrency(rentalIncome * 4.33)} /month (${formatCurrency(rentalIncome)} /week)`;
    } else if (rentalFrequency === "fortnightly") {
      return `${formatCurrency(rentalIncome * 2.17)} /month (${formatCurrency(rentalIncome)} /fortnight)`;
    } else {
      return `${formatCurrency(rentalIncome)} /month`;
    }
  };

  // Navigate to property details
  const viewDetails = () => {
    setLocation(`/assets/${property.id}`);
  };

  // Get property type label
  const getPropertyTypeLabel = (type: string | null | undefined): string => {
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
              
              {/* Show mortgage rate if we have it */}
              {mortgage && mortgage.interestRate > 0 && (
                <div className="flex justify-between">
                  <div className="text-sm text-muted-foreground flex items-center">
                    <Percent className="h-3 w-3 mr-1" />
                    Interest Rate
                  </div>
                  <div className="font-medium">
                    {mortgage.interestRate.toFixed(2)}% {mortgage.interestRateType ? `(${mortgage.interestRateType})` : ''}
                  </div>
                </div>
              )}
              
              {/* Show payment information if we have it */}
              {mortgage && mortgage.paymentAmount && mortgage.paymentAmount > 0 && (
                <div className="flex justify-between">
                  <div className="text-sm text-muted-foreground flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Payment
                  </div>
                  <div className="font-medium">
                    {formatCurrency(mortgage.paymentAmount || 0)}/{mortgage.paymentFrequency}
                  </div>
                </div>
              )}
              
              {/* Show loan term if we have it */}
              {mortgage && mortgage.loanTerm > 0 && (
                <div className="flex justify-between">
                  <div className="text-sm text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Term
                  </div>
                  <div className="font-medium">
                    {mortgage.remainingTerm ? (mortgage.remainingTerm / 12).toFixed(1) : (mortgage.loanTerm / 12).toFixed(1)} years
                  </div>
                </div>
              )}
              
              {/* Show interest expense if we have an interest rate */}
              {mortgageInterestRate && mortgageAmount > 0 && (
                <div className="flex justify-between">
                  <div className="text-sm text-muted-foreground">Interest Expenses</div>
                  <div className="font-medium text-amber-600">
                    {formatCurrency(calculateMonthlyInterestExpense({
                      mortgageInterestRate,
                      mortgageAmount
                    }))}/month
                  </div>
                </div>
              )}
              
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
              <div className="font-medium">{formatRentalIncome() as string}</div>
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