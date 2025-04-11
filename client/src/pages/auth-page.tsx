import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { loginUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import DemoOnboardingDialog from "@/components/onboarding/demo-onboarding-dialog";

// Extended login schema with remember me option
const loginFormSchema = loginUserSchema.extend({
  rememberMe: z.boolean().default(false),
});

// Registration schema
const registerFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginFormSchema>;
type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function AuthPage() {
  console.log("Rendering AuthPage component");
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);

  // Get login splash screen settings
  const { data: systemSettings } = useQuery<{
    loginSplashTitle?: string;
    loginSplashText?: string;
    loginSplashImageUrl?: string;
  }>({
    queryKey: ["/api/system-settings"],
  });
  
  // Function to create a demo user
  const createDemoUser = async () => {
    setIsCreatingDemo(true);
    try {
      console.log("Creating demo user...");
      
      // First, check if we have demo users already created that we can reuse
      const existingDemoResponse = await apiRequest("GET", "/api/demo-user/available");
      let demoUserId = null;
      
      if (existingDemoResponse.ok) {
        const existingDemoData = await existingDemoResponse.json();
        if (existingDemoData && existingDemoData.id) {
          // Use existing demo user if available
          demoUserId = existingDemoData.id;
        }
      }
      
      // If no existing demo user, create new one
      if (!demoUserId) {
        const response = await apiRequest("POST", "/api/register/demo", {});
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Demo user creation failed:", errorData);
          toast({
            title: "Error",
            description: errorData.message || "Failed to create demo account",
            variant: "destructive"
          });
          setIsCreatingDemo(false);
          return;
        }
        
        const userData = await response.json();
        console.log("Demo user created:", userData);
        demoUserId = userData.id;
      }
      
      // Fully clear and refresh queries to ensure fresh data
      await queryClient.resetQueries();
      
      // Show successful toast for better UX
      toast({
        title: "Demo Account Created",
        description: "Welcome to myAssetPlace! You're now using a demo account."
      });
      
      // Redirect to dashboard - force window.location for a hard refresh
      // Always redirect to root first to ensure the user is properly loaded
      window.location.href = "/";
      
    } catch (error) {
      console.error("Demo user creation error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingDemo(false);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = (values: LoginFormValues) => {
    const { rememberMe, ...credentials } = values;
    loginMutation.mutate(credentials);
  };

  const onRegisterSubmit = (values: RegisterFormValues) => {
    const { confirmPassword, ...registrationData } = values;
    registerMutation.mutate(registrationData);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Hero Section */}
      <div className="hidden md:flex md:w-1/2 bg-primary-600 p-8 flex-col justify-between">
        <div className="max-w-md">
          <h1 className="text-3xl font-heading font-bold text-white">
            {systemSettings?.loginSplashTitle || "Welcome to myAssetPlace"}
          </h1>
          <p className="mt-4 text-primary-100">
            {systemSettings?.loginSplashText || "Your comprehensive wealth management platform to track assets, monitor growth, and plan for the future."}
          </p>
        </div>
        {systemSettings?.loginSplashImageUrl ? (
          <img 
            src={systemSettings.loginSplashImageUrl} 
            alt="Financial management illustration" 
            className="rounded-lg shadow-lg mt-8 max-w-md"
          />
        ) : (
          <div className="rounded-lg bg-primary-700 shadow-lg mt-8 h-64 flex items-center justify-center">
            <p className="text-primary-200 text-center">Financial management platform</p>
          </div>
        )}
      </div>

      {/* Right side - Forms */}
      <div className="w-full md:w-1/2 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-heading font-bold text-slate-900">myAssetPlace</h2>
              <p className="text-sm text-slate-500 mt-1">Manage your wealth in one place</p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between">
                      <FormField
                        control={loginForm.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="rememberMe" 
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                            <label
                              htmlFor="rememberMe"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Remember me
                            </label>
                          </div>
                        )}
                      />

                      <a
                        href="#"
                        className="text-sm font-medium text-primary-600 hover:text-primary-500"
                      >
                        Forgot password?
                      </a>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Logging in..." : "Sign in"}
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-slate-500">Or continue with</span>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-3">
                      <Button 
                        variant="default" 
                        className="w-full bg-gradient-to-r from-primary-600 to-primary-500"
                        onClick={createDemoUser}
                        disabled={isCreatingDemo}
                      >
                        {isCreatingDemo ? "Creating Demo Account..." : "Try Demo Account"}
                      </Button>

                      <Button 
                        variant="secondary"
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white"
                        onClick={async () => {
                          console.log("Try Admin Account button clicked!");
                          // Directly use fetch instead of form submission
                          try {
                            console.log("Sending admin account login request...");
                            const response = await fetch('/api/login', {
                              method: 'POST',
                              credentials: 'include',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                username: "admin2",
                                password: "adminpassword123"
                              })
                            });
                            
                            console.log("Admin account login response status:", response.status);
                            if (response.ok) {
                              const data = await response.json();
                              console.log("Admin account login successful, user data:", data);
                              queryClient.setQueryData(["/api/user"], data);
                              toast({
                                title: "Admin login successful",
                                description: "Welcome to the admin dashboard!",
                              });
                              // Force a hard redirect
                              window.location.href = "/";
                            } else {
                              toast({
                                title: "Admin login failed",
                                description: "Please try again with Direct Admin Login button",
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            console.error("Admin account login error:", error);
                            toast({
                              title: "Login error",
                              description: "Please try Direct Admin Login instead",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Logging in..." : "Try Admin Account"}
                      </Button>
                      
                      <Button 
                        variant="secondary"
                        className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white"
                        onClick={async () => {
                          console.log("Direct admin login button clicked!");
                          try {
                            console.log("Sending admin login request...");
                            const response = await fetch('/api/admin-login', {
                              method: 'POST',
                              credentials: 'include',
                              headers: {
                                'Content-Type': 'application/json'
                              }
                            });
                            
                            console.log("Admin login response status:", response.status);
                            if (response.ok) {
                              const data = await response.json();
                              console.log("Admin login successful, user data:", data);
                              queryClient.setQueryData(["/api/user"], data);
                              toast({
                                title: "Admin login successful",
                                description: "Welcome to the admin dashboard!",
                              });
                              // Use a hard redirect instead of navigation hook
                              window.location.href = "/";
                            } else {
                              console.error("Admin login failed with status:", response.status);
                              // Try to get error message from response
                              let errorMsg = "Please try again later.";
                              try {
                                const errorData = await response.json();
                                errorMsg = errorData.message || errorMsg;
                                console.error("Error details:", errorData);
                              } catch (e) {}
                              
                              toast({
                                title: "Admin login failed",
                                description: errorMsg,
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            console.error("Admin login request error:", error);
                            toast({
                              title: "Admin login error",
                              description: "Please try again later.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Direct Admin Login
                      </Button>
                      
                      <Button variant="outline" className="w-full">
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"></path>
                        </svg>
                        Sign in with Google
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Mobile-only hero section (shown at the top on mobile) */}
      <div className="md:hidden bg-primary-600 p-8 text-center">
        <h1 className="text-2xl font-heading font-bold text-white">
          {systemSettings?.loginSplashTitle || "Welcome to myAssetPlace"}
        </h1>
        <p className="mt-2 text-sm text-primary-100">
          {systemSettings?.loginSplashText || "Your comprehensive wealth management platform"}
        </p>
      </div>
    </div>
  );
}
