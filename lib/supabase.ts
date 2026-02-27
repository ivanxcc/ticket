import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type DbProfile = {
  id: string;
  household_id: string | null;
  name: string;
  emoji: string;
  color: string;
  push_token: string | null;
  created_at: string;
};

export type DbHousehold = {
  id: string;
  invite_code: string;
  created_at: string;
};

export type DbTicket = {
  id: string;
  household_id: string;
  ticket_number: number;
  title: string;
  description: string;
  category: string;
  assigned_to: string | null;
  created_by: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
};

export type DbNotification = {
  id: string;
  user_id: string;
  household_id: string | null;
  ticket_id: string | null;
  type: 'ticket_assigned' | 'ticket_reassigned' | 'ticket_status_changed';
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};
