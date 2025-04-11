import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Form schema
const splashFormSchema = z.object({
  loginSplashTitle: z.string().min(2, "Title is required"),
  loginSplashText: z.string().min(2, "Message is required"),
  loginSplashImageUrl: z.string().url("Please enter a valid URL").optional(),
});

type SplashFormValues = z.infer<typeof splashFormSchema>;

export default function LoginSplashConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get system settings
  const { data: systemSettings, isLoading } = useQuery({
    queryKey: ["/api/system-settings"],
  });

  // Form setup
  const form = useForm<SplashFormValues>({
    resolver: zodResolver(splashFormSchema),
    defaultValues: {
      loginSplashTitle: "",
      loginSplashText: "",
      loginSplashImageUrl: "",
    },
  });

  // Set form values when settings load
  React.useEffect(() => {
    if (systemSettings) {
      form.reset({
        loginSplashTitle: systemSettings.loginSplashTitle || "Welcome to myAssetPlace",
        loginSplashText: systemSettings.loginSplashText || "Your comprehensive wealth management platform",
        loginSplashImageUrl: systemSettings.loginSplashImageUrl || "",
      });
    }
  }, [systemSettings, form]);

  // Update system settings mutation
  const updateSettings = useMutation({
    mutationFn: async (values: SplashFormValues) => {
      const res = await apiRequest("PUT", "/api/system-settings", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      toast({
        title: "Settings updated",
        description: "Login splash screen settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission
  function onSubmit(values: SplashFormValues) {
    updateSettings.mutate(values);
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b border-slate-200">
        <CardTitle className="text-md font-semibold text-slate-900">Login Screen Customization</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="loginSplashTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="loginSplashText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="loginSplashImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Background Image URL</FormLabel>
                  <div className="flex items-center gap-4">
                    {field.value && (
                      <div className="flex-shrink-0 h-16 w-16 bg-slate-100 rounded-md overflow-hidden">
                        <img 
                          src={field.value}
                          alt="Splash preview" 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/100?text=Invalid+Image";
                          }}
                        />
                      </div>
                    )}
                    <FormControl className="flex-1">
                      <Input {...field} placeholder="https://example.com/image.jpg" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button
              type="submit"
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
