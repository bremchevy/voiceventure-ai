# Share Functionality Implementation Plan

## Overview
This document outlines the implementation plan for adding sharing capabilities to the WorksheetGenerator component, focusing on email sharing as the primary feature, followed by cloud storage integration.

## Features Priority

### Phase 1: Email Sharing (Primary Focus)
- Integration with SendGrid for reliable email delivery
- Fixed, branded email template
- Simple share button on the PDF preview page
- Basic success/error notifications

### Phase 2: Cloud Storage Integration
Priority order:
1. Google Drive (Primary)
2. Dropbox
3. OneDrive

## Technical Implementation

### Phase 1: Email Sharing

1. Email Service Setup
   - Implement SendGrid integration
     - Simple setup with API key
     - Reliable delivery and tracking
     - Good free tier for starting out
   - Create fixed email template with:
     - Professional design
     - Worksheet preview/thumbnail
     - Download button/link
     - Your branding
   - Required endpoint:
     ```typescript
     POST /api/share/email
     ```

2. Frontend Implementation
   - Add share button to PDF preview page
   - Simple share modal with:
     - Email input field (support multiple emails)
     - Send button
     - Success/error notifications
   - Loading states during sending

### Phase 2: Cloud Storage Integration

1. Google Drive Integration
   - OAuth2 authentication setup
   - Direct upload functionality
   - Shareable link generation
   - Required endpoints:
     ```typescript
     POST /api/share/drive/upload
     POST /api/share/drive/link
     ```

2. Additional Storage Providers
   - Dropbox integration
   - OneDrive integration
   - Common interface for all providers

## API Contracts

### Email Sharing
```typescript
interface EmailShareRequest {
  recipients: string[];
  worksheetId: string;
}

interface EmailShareResponse {
  success: boolean;
  error?: string;
}
```

### Cloud Storage
```typescript
interface CloudStorageUploadRequest {
  provider: 'google-drive' | 'dropbox' | 'onedrive';
  worksheetId: string;
}

interface CloudStorageUploadResponse {
  success: boolean;
  shareableLink?: string;
  error?: string;
}
```

## Dependencies
1. Email Service:
   - @sendgrid/mail
   - Why SendGrid:
     - Easy to set up and use
     - Reliable delivery
     - Good documentation
     - Generous free tier (100 emails/day)
     - Simple API

2. Cloud Storage:
   - @google-cloud/storage (Priority)
   - dropbox
   - @microsoft/microsoft-graph-client

## Timeline

### Phase 1: Email Sharing (2 weeks)
Week 1:
- SendGrid setup and integration
- Email template creation
- Basic API endpoint implementation

Week 2:
- Frontend share button and modal
- Testing and refinements
- Error handling and notifications

### Phase 2: Cloud Storage (3 weeks)
Week 3:
- Google Drive integration
- Frontend updates for Drive support

Week 4:
- Dropbox integration
- OneDrive integration

Week 5:
- Testing all providers
- Final refinements and bug fixes

## Implementation Notes
1. Email Sharing:
   - Simple, focused interface
   - Fixed, professional template
   - No history tracking needed
   - Minimal setup required

2. Cloud Storage:
   - Implement providers one at a time
   - Focus on Google Drive first
   - Simple upload and link sharing
   - No complex permissions needed

## Testing Strategy
1. Unit Tests
   - Email service functions
   - Cloud storage adapters
   - UI components

2. Integration Tests
   - End-to-end sharing flow
   - Cloud storage authentication
   - Email delivery 