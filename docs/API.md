# VoiceVenture AI API Documentation

## Authentication

VoiceVenture AI uses Supabase Auth for authentication. All API endpoints require authentication unless specified otherwise.

### Authentication Headers
```typescript
{
  "Authorization": "Bearer <access_token>"
}
```

## Database Schema

### Profiles Table
```sql
profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  avatar_url text,
  school text,
  subject text,
  grade_level text,
  preferences jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

### Chat History Table
```sql
chat_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  message text not null,
  type text not null check (type in ('user', 'assistant')),
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
)
```

### Voice Recordings Table
```sql
voice_recordings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  file_path text not null,
  transcription text,
  duration integer,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
)
```

### Notification Settings Table
```sql
notification_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) unique,
  email_notifications boolean default true,
  sales_updates boolean default true,
  resource_comments boolean default true,
  marketing_emails boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

## API Endpoints

### Profile Management

#### Get Profile
```typescript
GET /rest/v1/profiles?id=eq.<user_id>
Response: Profile
```

#### Update Profile
```typescript
PATCH /rest/v1/profiles?id=eq.<user_id>
Body: Partial<Profile>
Response: Profile
```

#### Update Preferences
```typescript
PATCH /rest/v1/profiles?id=eq.<user_id>
Body: { preferences: Record<string, any> }
Response: Profile
```

### Chat History

#### Get Chat History
```typescript
GET /rest/v1/chat_history?user_id=eq.<user_id>&order=created_at.desc
Response: ChatMessage[]
```

#### Add Chat Message
```typescript
POST /rest/v1/chat_history
Body: { user_id: string, message: string, type: 'user' | 'assistant' }
Response: ChatMessage
```

### Voice Recordings

#### Get Voice Recordings
```typescript
GET /rest/v1/voice_recordings?user_id=eq.<user_id>&order=created_at.desc
Response: VoiceRecording[]
```

#### Add Voice Recording
```typescript
POST /rest/v1/voice_recordings
Body: { user_id: string, file_path: string, duration?: number }
Response: VoiceRecording
```

### Notification Settings

#### Get Notification Settings
```typescript
GET /rest/v1/notification_settings?user_id=eq.<user_id>
Response: NotificationSettings
```

#### Update Notification Settings
```typescript
PATCH /rest/v1/notification_settings?user_id=eq.<user_id>
Body: Partial<NotificationSettings>
Response: NotificationSettings
```

## Row Level Security (RLS) Policies

All tables have RLS enabled with the following policies:

### Profiles
- Users can only view their own profile
- Users can only update their own profile
- Users can only insert their own profile
- Users can only delete their own profile

### Chat History
- Users can only view their own chat history
- Users can only insert their own chat messages
- Users can only update their own chat messages
- Users can only delete their own chat messages

### Voice Recordings
- Users can only view their own recordings
- Users can only insert their own recordings
- Users can only update their own recordings
- Users can only delete their own recordings

### Notification Settings
- Users have full control over their own notification settings

## TypeScript Types

```typescript
interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  school: string | null;
  subject: string | null;
  grade_level: string | null;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  type: 'user' | 'assistant';
  metadata: Record<string, any>;
  created_at: string;
}

interface VoiceRecording {
  id: string;
  user_id: string;
  file_path: string;
  transcription: string | null;
  duration: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  sales_updates: boolean;
  resource_comments: boolean;
  marketing_emails: boolean;
  created_at: string;
  updated_at: string;
}
``` 