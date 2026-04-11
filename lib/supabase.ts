import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Check your environment variables.');
}

// Create client only if credentials exist, otherwise provide a dummy client that warns on use
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Supabase not configured' } }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ 
          order: () => ({ data: [], error: { message: 'Supabase not configured' } }), 
          eq: () => ({ 
            single: () => ({ data: null, error: null }), 
            maybeSingle: () => ({ data: null, error: null }),
            delete: () => ({ eq: () => ({}) }) 
          }),
          neq: () => ({ eq: () => ({ maybeSingle: () => ({ data: null, error: null }) }) })
        }),
        insert: () => ({ error: null }),
        upsert: () => ({ error: null }),
        update: () => ({ eq: () => ({ error: null }) }),
        delete: () => ({ eq: () => ({ error: null }) }),
      })
    } as any;
