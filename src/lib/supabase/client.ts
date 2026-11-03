/**
 * Cliente oficial de Supabase — SoundLab AI
 * © 2026 URBINA ASESORÍA E INVERSIONES S.A.C.
 */
import { createClient, type User, type Session } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || "https://pkjunhbuormzdkhbrxfd.supabase.co";
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "sb_publishable_HXL685onWMEo-4shko9J8g_nPVysfUf";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Correos con privilegio exclusivo de Administrador */
export const ADMIN_EMAILS = [
  "urbinaasesoriaeinversiones@gmail.com",
  "murbinasojo@gmail.com",
];

export function checkIsAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export interface UserProfile {
  id: string;
  email: string;
  artist_name: string;
  full_name: string;
  phone?: string;
  country: string;
  plan: "free" | "pro";
  credits: number;
  isAdmin: boolean;
}

export interface DbOrder {
  id: string;
  user_id: string;
  item_type: "plan" | "pack";
  item_id: string;
  item_name: string;
  amount: number;
  currency: "PEN" | "USD" | "EUR";
  payment_method: "yape_plin" | "mercadopago" | "payoneer";
  status: "pending" | "approved" | "rejected" | "refunded";
  reference_code: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  created_at: string;
  approved_at?: string;
}

export type { User, Session };
