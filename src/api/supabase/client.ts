import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../lib/env';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      'Supabase 환경변수가 없습니다. .env 파일에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 설정해주세요.',
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
  }

  return supabaseClient;
}
