import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Asset } from "@shared/schema";
import { Link } from "wouter";

interface RecentAssetsProps {
  assets: Asset[];
}

export default function RecentAssets({ assets }: RecentAssetsProps) {
  // Fetch asset classes to display names
  const { data: assetClasses } = useQuery({
    queryKey: ["/api/asset-classes"],
  });
  
  // Fetch asset holding types to display names
  const { data: holdingTypes } = useQuery({
    queryKey: ["/api/asset-holding-types"],
  });
  
  // Get class and holding type names for display
  const getAssetClassName = (classId: number) => {
    if (!assetClasses) return "Loading...";
    const assetClass = assetClasses.find(c => c.id === classId);
    return assetClass ? assetClass.name : "Unknown";
  };
  
  const getHoldingTypeName = (typeId: number) => {
    if (!holdingTypes) return "Loading...";
    const holdingType = holdingTypes.find(t => t.id === typeId);
    return holdingType ? holdingType.name : "Unknown";
  };

  return (
    <section className="mb-6">
      <Card>
        <CardHeader className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-slate-900">Recent Assets</CardTitle>
          <Link href="/assets">
            <Button variant="link" className="text-primary-600 hover:text-primary-500 p-0">
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Holding</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.length > 0 ? (
                  assets.slice(0, 3).map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div className="text-sm font-medium text-slate-900">{asset.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-500">{getAssetClassName(asset.assetClassId)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-500">{getHoldingTypeName(asset.assetHoldingTypeId)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-900">${asset.value.toLocaleString()}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/assets/${asset.id}`}>
                          <Button variant="link" className="text-primary-600 hover:text-primary-900">
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      <p>No assets found</p>
                      <Button variant="link" className="mt-2">
                        <Link href="/assets/new">Add your first asset</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
