import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// UI components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

const onboardingSchema = z.object({
  age: z.number().min(18, {
    message: "You must be at least 18 years old",
  }).max(100, {
    message: "Age must be less than 100",
  }),
  targetRetirementAge: z.number().min(18, {
    message: "Target retirement age must be at least 18",
  }).max(100, {
    message: "Target retirement age must be less than 100",
  }),
}).refine((data) => data.targetRetirementAge > data.age, {
  message: "Target retirement age must be greater than current age",
  path: ["targetRetirementAge"],
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function DemoOnboardingDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(user?.isDemo && !user?.completedOnboarding);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      age: 35,
      targetRetirementAge: 65,
    },
  });

  const onSubmit = async (data: OnboardingFormData) => {
    try {
      const response = await apiRequest("PUT", "/api/user/onboarding", {
        ...data,
        completedOnboarding: true,
      });

      if (response.ok) {
        toast({
          title: "Setup Complete",
          description: "Your preferences have been saved.",
        });
        setIsOpen(false);
        navigate("/");
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your preferences",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Only allow closing through submit button
        if (!open) {
          setIsOpen(open);
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to myAssetPlace</DialogTitle>
          <DialogDescription>
            Let's personalize your experience with a few quick questions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Your Age</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Slider
                        min={18}
                        max={100}
                        step={1}
                        defaultValue={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                      <div className="flex justify-between">
                        <span className="text-sm">{field.value} years</span>
                        <Input
                          type="number"
                          className="w-16 h-8 text-center"
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 18)}
                          min={18}
                          max={100}
                        />
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    This helps us personalize financial projections.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetRetirementAge"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Target Retirement Age</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Slider
                        min={18}
                        max={100}
                        step={1}
                        defaultValue={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                      <div className="flex justify-between">
                        <span className="text-sm">{field.value} years</span>
                        <Input
                          type="number"
                          className="w-16 h-8 text-center"
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 18)}
                          min={18}
                          max={100}
                        />
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    When do you plan to retire? This helps us with retirement planning.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Continue to Dashboard</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}