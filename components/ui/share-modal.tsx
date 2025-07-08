"use client"

import * as React from "react";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogPortal, DialogOverlay, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Mail, Plus, X, Loader2, Check } from 'lucide-react';
import { Resource } from '@/lib/types/resource';
import { cn } from "@/lib/utils";

// Custom DialogContent without close button
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource;
}

export function ShareModal({ isOpen, onClose, resource }: ShareModalProps) {
  const [emails, setEmails] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const addEmailInput = () => {
    if (emails.length < 10) { // Limit to 10 recipients
      setEmails([...emails, '']);
    }
  };

  const removeEmailInput = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const validateEmails = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails.filter(email => email.trim() && emailRegex.test(email.trim()));
    const invalidEmails = emails.filter(email => email.trim() && !emailRegex.test(email.trim()));
    
    return { validEmails, invalidEmails };
  };

  const handleShare = async () => {
    const { validEmails, invalidEmails } = validateEmails();

    if (validEmails.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one valid email address.",
        variant: "destructive"
      });
      return;
    }

    if (invalidEmails.length > 0) {
      toast({
        title: "Error",
        description: `Invalid email addresses: ${invalidEmails.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/share/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: validEmails,
          worksheetData: resource
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API error: ${response.status} ${text}`);
      }

      const result = await response.json();

      if (result.success) {
        // Show success toast
        toast({
          title: "Resource Shared Successfully! 🎉",
          description: `Your ${resource.resourceType || 'worksheet'} "${resource.title}" has been sent to ${validEmails.length} ${validEmails.length === 1 ? 'recipient' : 'recipients'}. They will receive it in their inbox shortly.`,
          variant: "default",
          duration: 5000
        });

        // Show success state in modal
        setShowSuccess(true);
        setIsLoading(false);
        setEmails(['']); // Reset email inputs
      } else {
        throw new Error(result.error || 'Failed to share worksheet');
      }
    } catch (error) {
      console.error('Error sharing worksheet:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share worksheet. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmails(['']); // Reset form when closing
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <CustomDialogContent className="sm:max-w-md">
        {showSuccess ? (
          <div className="py-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Resource Shared Successfully!
              </h3>
              <div className="bg-green-50 p-4 rounded-lg mx-auto max-w-sm mb-6">
                <p className="text-sm text-green-800 mb-2">
                  Your {resource.resourceType || 'worksheet'} "{resource.title}" has been sent to:
                </p>
                <ul className="text-sm text-green-700 space-y-1">
                  {emails.filter(email => email.trim()).map((email, idx) => (
                    <li key={idx} className="font-medium">{email}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Recipients will receive the resource in their inbox shortly.
              </p>
              <Button 
                onClick={() => {
                  setShowSuccess(false);
                  onClose();
                }}
                className="w-full max-w-xs"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Share Worksheet via Email
              </DialogTitle>
              <DialogDescription>
                Enter email addresses to share this worksheet with others.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Worksheet Info */}
              <div className="bg-gray-50 p-3 rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-1">{resource.title}</h4>
                <div className="flex gap-4 text-xs text-gray-600">
                  <span>{resource.subject}</span>
                  <span>{resource.grade_level}</span>
                  <span className="capitalize">{resource.resourceType || 'worksheet'}</span>
                </div>
              </div>

              {/* Email Inputs */}
              <div className="space-y-3">
                <Label htmlFor="emails" className="text-sm font-medium">
                  Recipient Email Addresses
                </Label>
                {emails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      className="flex-1"
                      disabled={isLoading}
                    />
                    {emails.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeEmailInput(index)}
                        disabled={isLoading}
                        className="shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {emails.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEmailInput}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Email
                  </Button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleShare}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CustomDialogContent>
    </Dialog>
  );
} 