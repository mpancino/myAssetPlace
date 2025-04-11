import { useForm } from "react-hook-form";
import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SystemSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get system settings
  const { data: systemSettings, isLoading } = useQuery<SystemSettings>({
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
  useEffect(() => {
    if (systemSettings) {
      // Handle optional properties by using nullish coalescing
      const settings = systemSettings as Partial<SystemSettings>;
      form.reset({
        loginSplashTitle: settings?.loginSplashTitle ?? "Welcome to myAssetPlace",
        loginSplashText: settings?.loginSplashText ?? "Your comprehensive wealth management platform",
        loginSplashImageUrl: settings?.loginSplashImageUrl ?? "",
      });
    }
  }, [systemSettings, form]);

  // Image upload mutation
  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      
      const res = await fetch("/api/upload/splash-image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to upload image");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Update the form with the new image URL
      form.setValue("loginSplashImageUrl", data.imageUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      setUploadError(null);
      
      toast({
        title: "Image uploaded",
        description: "Image has been uploaded and saved successfully.",
      });
    },
    onError: (error: Error) => {
      setUploadError(error.message);
      toast({
        title: "Failed to upload image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file (JPEG, PNG, etc.)");
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be less than 5MB");
      return;
    }
    
    // Upload the image
    uploadImage.mutate(file);
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
                  <FormLabel>Background Image</FormLabel>
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
                  <div className="mt-2">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleUploadClick}
                      disabled={uploadImage.isPending}
                      className="flex items-center gap-2"
                    >
                      {uploadImage.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload Image
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-slate-500 mt-1">
                      Supported formats: JPEG, PNG, GIF (max 5MB)
                    </p>
                  </div>
                  {uploadError && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button
              type="submit"
              disabled={updateSettings.isPending || uploadImage.isPending}
            >
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
