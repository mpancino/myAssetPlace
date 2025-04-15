/**
 * Form Template Component
 * 
 * This template provides a standardized structure for all form components
 * in myAssetPlace, following the design guide standards.
 */

import React, { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface FormTemplateProps {
  /** Title for the form card */
  title: string;
  /** Optional description for the form card */
  description?: string;
  /** Form content */
  children: ReactNode;
  /** Submit button text */
  submitText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Is form submitting */
  isSubmitting?: boolean;
  /** Form submission handler */
  onSubmit: (e: React.FormEvent) => void;
  /** Cancel handler */
  onCancel?: () => void;
  /** Additional footer content */
  footerContent?: ReactNode;
}

export function FormTemplate({
  title,
  description,
  children,
  submitText = "Save",
  cancelText = "Cancel",
  isSubmitting = false,
  onSubmit,
  onCancel,
  footerContent,
}: FormTemplateProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-6">
          {children}
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <div>
            {footerContent}
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {cancelText}
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {submitText}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

/**
 * Form Section Component
 * 
 * This component provides a standardized way to create sections within a form.
 */

interface FormSectionProps {
  /** Title for the section */
  title?: string;
  /** Whether to use a two-column layout for fields on desktop */
  twoColumns?: boolean;
  /** Section content */
  children: ReactNode;
}

export function FormSection({
  title,
  twoColumns = false,
  children,
}: FormSectionProps) {
  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-medium">{title}</h3>}
      <div className={twoColumns ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}>
        {children}
      </div>
    </div>
  );
}

/**
 * Tabbed Form Template Component
 * 
 * This template provides a standardized structure for tabbed forms.
 */

interface TabbedFormTemplateProps extends Omit<FormTemplateProps, "children"> {
  /** Tabs configuration */
  tabs: {
    /** Tab ID (used as value) */
    id: string;
    /** Tab label */
    label: string;
    /** Tab content */
    content: ReactNode;
  }[];
  /** Active tab */
  activeTab: string;
  /** Set active tab function */
  setActiveTab: (tab: string) => void;
}

export function TabbedFormTemplate({
  title,
  description,
  tabs,
  activeTab,
  setActiveTab,
  submitText = "Save",
  cancelText = "Cancel",
  isSubmitting = false,
  onSubmit,
  onCancel,
  footerContent,
}: TabbedFormTemplateProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <form onSubmit={onSubmit}>
        <div className="px-6">
          <div className="border-b">
            <div className="flex overflow-x-auto -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <CardContent className="pt-6 space-y-6">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={activeTab === tab.id ? "block" : "hidden"}
            >
              {tab.content}
            </div>
          ))}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t p-6">
          <div>
            {footerContent}
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {cancelText}
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {submitText}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}