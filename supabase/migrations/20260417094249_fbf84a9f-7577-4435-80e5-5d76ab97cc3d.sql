-- ===========================================
-- Airo schema
-- ===========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ---------- profiles ----------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------- roles ----------
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ---------- trips ----------
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  origin TEXT,
  start_date DATE,
  end_date DATE,
  traveler_count INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'planning',
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- ---------- trip_items ----------
CREATE TABLE public.trip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('flight', 'hotel', 'attraction')),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  rating NUMERIC(2,1),
  best_value BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  booking_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trip_items ENABLE ROW LEVEL SECURITY;

-- ---------- trip_collaborators ----------
CREATE TABLE public.trip_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);
ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- Policies (after all tables exist)
-- ===========================================

-- profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- trips
CREATE POLICY "Owners can view their trips"
  ON public.trips FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Collaborators can view trips"
  ON public.trips FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.trip_collaborators c WHERE c.trip_id = trips.id AND c.user_id = auth.uid())
  );
CREATE POLICY "Owners can insert trips"
  ON public.trips FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update trips"
  ON public.trips FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete trips"
  ON public.trips FOR DELETE USING (auth.uid() = owner_id);

-- trip_items
CREATE POLICY "View items of accessible trips"
  ON public.trip_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_items.trip_id
        AND (t.owner_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.trip_collaborators c WHERE c.trip_id = t.id AND c.user_id = auth.uid()))
    )
  );
CREATE POLICY "Owners can manage trip items"
  ON public.trip_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_items.trip_id AND t.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_items.trip_id AND t.owner_id = auth.uid())
  );

-- trip_collaborators
CREATE POLICY "View collaborators of accessible trips"
  ON public.trip_collaborators FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_collaborators.trip_id AND t.owner_id = auth.uid())
  );
CREATE POLICY "Owners can manage collaborators"
  ON public.trip_collaborators FOR ALL USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_collaborators.trip_id AND t.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_collaborators.trip_id AND t.owner_id = auth.uid())
  );
CREATE POLICY "Users can self-add via shared token"
  ON public.trip_collaborators FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- Triggers
-- ===========================================
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_trips_owner ON public.trips(owner_id);
CREATE INDEX idx_trips_share_token ON public.trips(share_token);
CREATE INDEX idx_trip_items_trip ON public.trip_items(trip_id);
CREATE INDEX idx_trip_collab_trip ON public.trip_collaborators(trip_id);
CREATE INDEX idx_trip_collab_user ON public.trip_collaborators(user_id);
