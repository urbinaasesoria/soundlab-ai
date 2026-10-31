-- ============================================================================
-- SoundLab AI — Esquema de Base de Datos para Supabase (PostgreSQL)
-- © 2026 URBINA ASESORÍA E INVERSIONES S.A.C. Todos los derechos reservados.
-- ============================================================================

-- Habilitar extensión UUID si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: PROFILES (Perfiles de usuario vinculados a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  artist_name TEXT DEFAULT 'Artista',
  full_name TEXT,
  phone TEXT,
  country TEXT DEFAULT 'PE',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  plan_cycle TEXT CHECK (plan_cycle IN ('monthly', 'annual')),
  plan_renews_at TIMESTAMPTZ,
  credits INTEGER NOT NULL DEFAULT 1850 CHECK (credits >= 0),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 2. TABLA: ORDERS (Registro de pagos por Yape/Plin, Mercado Pago y Payoneer)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('plan', 'pack')),
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('PEN', 'USD', 'EUR')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('yape_plin', 'mercadopago', 'payoneer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  reference_code TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  voucher_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  approved_at TIMESTAMPTZ
);

-- 3. TABLA: CREDIT_TRANSACTIONS (Libro mayor auditable de consumo y recarga de créditos)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- SEGURIDAD A NIVEL DE FILA (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
CREATE POLICY "Los usuarios pueden ver su propio perfil" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Políticas para Orders
CREATE POLICY "Los usuarios pueden ver sus propios pedidos" 
  ON public.orders FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Permitir crear pedidos a usuarios autenticados o anónimos" 
  ON public.orders FOR INSERT 
  WITH CHECK (true);

-- Políticas para Transacciones de Créditos
CREATE POLICY "Los usuarios pueden ver sus movimientos de créditos" 
  ON public.credit_transactions FOR SELECT 
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER: Creación automática de perfil al registrarse un usuario en Supabase
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, artist_name, full_name, plan, credits)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'artist_name', 'Artista'),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'free',
    1850
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- FUNCIÓN: Aprobación de pedidos y abono automático de créditos
-- ============================================================================
CREATE OR REPLACE FUNCTION public.approve_order(target_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_new_credits INTEGER;
  v_user_credits INTEGER;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = target_order_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  IF v_order.status = 'approved' THEN
    RETURN;
  END IF;

  -- Determinar créditos o plan a asignar
  IF v_order.item_type = 'plan' THEN
    UPDATE public.profiles
    SET plan = 'pro',
        credits = credits + 1000000,
        updated_at = NOW()
    WHERE id = v_order.user_id;
  ELSIF v_order.item_type = 'pack' THEN
    -- El metadata contiene los créditos base + bono
    v_new_credits := COALESCE((v_order.metadata->>'credits')::integer, 0);
    UPDATE public.profiles
    SET credits = credits + v_new_credits,
        updated_at = NOW()
    WHERE id = v_order.user_id;
  END IF;

  -- Actualizar estado del pedido
  UPDATE public.orders
  SET status = 'approved',
      approved_at = NOW()
  WHERE id = target_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

