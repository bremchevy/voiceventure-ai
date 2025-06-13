import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

console.log('Initializing Supabase client with URL:', supabaseUrl)

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
})

export interface Message {
  sender: "user" | "assistant"
  content: string
  created_at?: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  created_at: string
  updated_at: string
}

export const SupabaseConversationManager = {
  // Get all conversations for the current user
  getAllConversations: async (): Promise<Conversation[]> => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Error getting user:', userError)
      return []
    }
    
    if (!user) {
      console.error('No authenticated user found')
      return []
    }

    console.log('Getting conversations for user:', user.id)

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        messages:messages(*)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return []
    }

    console.log('Found conversations:', conversations)
    return conversations.map(conv => ({
      ...conv,
      messages: conv.messages || []
    }))
  },

  // Get a specific conversation
  getConversation: async (id: string): Promise<Conversation | null> => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Error getting user:', userError)
      return null
    }
    
    if (!user) {
      console.error('No authenticated user found')
      return null
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        messages:messages(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !conversation) {
      console.error('Error fetching conversation:', error)
      return null
    }

    return {
      ...conversation,
      messages: conversation.messages || []
    }
  },

  // Create a new conversation
  createConversation: async (title: string = 'New Conversation'): Promise<Conversation | null> => {
    console.log('Creating new conversation with title:', title)
    
    // First check if we have a session
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error('Error getting session:', sessionError)
      return null
    }
    
    if (!session?.user) {
      console.error('No session found')
      return null
    }
    
    // Then get the user to double check
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('Error getting user:', userError)
      return null
    }
    
    if (!user) {
      console.error('No user found')
      return null
    }

    console.log('Creating conversation for user:', user.id)

    const { data: conversation, error: insertError } = await supabase
      .from('conversations')
      .insert([{ 
        title,
        user_id: user.id 
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating conversation:', insertError)
      return null
    }

    if (!conversation) {
      console.error('No conversation returned after creation')
      return null
    }

    console.log('Created conversation:', conversation)
    return {
      ...conversation,
      messages: []
    }
  },

  // Add message to conversation
  addMessage: async (conversationId: string, sender: "user" | "assistant", content: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user found')
      return
    }

    // First, verify the conversation belongs to the user
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!conversation) {
      console.error('Conversation not found or unauthorized')
      return
    }

    // Then insert the message
    const { error: messageError } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        role: sender,
        content
      }])

    if (messageError) {
      console.error('Error adding message:', messageError)
      return
    }

    // Update the conversation's updated_at timestamp
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (updateError) {
      console.error('Error updating conversation timestamp:', updateError)
    }
  },

  // Delete a conversation
  deleteConversation: async (id: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user found')
      return
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting conversation:', error)
    }
  },

  // Subscribe to conversation changes
  subscribeToConversations: (callback: (conversations: Conversation[]) => void) => {
    const { data: { user } } = supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user found')
      return () => {}
    }

    // Subscribe to conversation changes
    const conversationChannel = supabase
      .channel('conversation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${user.id}`
        },
        async () => {
          // Fetch updated conversations
          const conversations = await SupabaseConversationManager.getAllConversations()
          callback(conversations)
        }
      )
      .subscribe()

    // Subscribe to message changes
    const messageChannel = supabase
      .channel('message-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        async () => {
          // Fetch updated conversations
          const conversations = await SupabaseConversationManager.getAllConversations()
          callback(conversations)
        }
      )
      .subscribe()

    // Return cleanup function
    return () => {
      const cleanup = async () => {
        try {
          await conversationChannel.unsubscribe()
          await messageChannel.unsubscribe()
          await supabase.removeChannel(conversationChannel)
          await supabase.removeChannel(messageChannel)
        } catch (error) {
          console.error('Error cleaning up conversation subscriptions:', error)
        }
      }
      cleanup()
    }
  }
} 