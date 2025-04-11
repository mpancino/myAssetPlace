import { useEffect } from "react";
import { useLocation } from "wouter";
import MainLayout from "@/components/layout/main-layout";

export default function HomePage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redirect to dashboard page
    navigate("/dashboard");
  }, [navigate]);

  return (
    <MainLayout>
      <div className="flex items-center justify-center h-full">
        <p>Redirecting to Dashboard...</p>
      </div>
    </MainLayout>
  );
}
