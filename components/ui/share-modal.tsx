"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Mail, Plus, X, Loader2 } from 'lucide-react';
import { Resource } from '@/lib/types/resource';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource;
}

export function ShareModal({ isOpen, onClose, resource }: ShareModalProps) {
  const [emails, setEmails] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);

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
      console.log('Sending share request with data:', {
        recipients: validEmails,
        worksheetData: resource
      });

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

      console.log('Share API response status:', response.status);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('Share API error response:', text);
        throw new Error(`API error: ${response.status} ${text}`);
      }

      const result = await response.json();
      console.log('Share API response data:', result);

      if (result.success) {
        toast({
          title: "Success!",
          description: `Worksheet shared with ${validEmails.length} recipient(s).`,
          variant: "default"
        });
        setEmails(['']); // Reset form
        onClose();
      } else {
        throw new Error(result.error || 'Failed to share worksheet');
      }
    } catch (error) {
      console.error('Error sharing worksheet:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share worksheet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
      <DialogContent className="sm:max-w-md" description="Share your worksheet with others via email">
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
              <span>{resource.gradeLevel}</span>
              <span className="capitalize">{resource.type || 'worksheet'}</span>
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
      </DialogContent>
    </Dialog>
  );
} 