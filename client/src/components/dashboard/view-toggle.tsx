import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ViewToggleProps {
  view: "assetClass" | "holdingType";
  onChange: (value: "assetClass" | "holdingType") => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex justify-center mb-6">
      <RadioGroup
        value={view}
        onValueChange={(value) => onChange(value as "assetClass" | "holdingType")}
        className="flex space-x-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="assetClass" id="assetClass" />
          <Label htmlFor="assetClass">By Asset Class</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="holdingType" id="holdingType" />
          <Label htmlFor="holdingType">By Holding Type</Label>
        </div>
      </RadioGroup>
    </div>
  );
}