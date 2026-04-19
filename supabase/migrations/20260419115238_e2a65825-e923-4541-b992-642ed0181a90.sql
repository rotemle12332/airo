-- Fix infinite recursion: trips policy referenced trip_collaborators,
-- and trip_collaborators policy referenced trips → infinite loop.
-- Solution: use a SECURITY DEFINER helper function that bypasses RLS.

CREATE OR REPLACE FUNCTION public.is_trip_accessible(_trip_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = _trip_id
      AND (
        t.owner_id = _user_id
        OR EXISTS (
          SELECT 1 FROM public.trip_collaborators c
          WHERE c.trip_id = t.id AND c.user_id = _user_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_owner(_trip_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = _trip_id AND t.owner_id = _user_id
  );
$$;

-- Drop old recursive policies on trips
DROP POLICY IF EXISTS "Collaborators can view trips" ON public.trips;
DROP POLICY IF EXISTS "Owners can view their trips" ON public.trips;
DROP POLICY IF EXISTS "Owners can insert trips" ON public.trips;
DROP POLICY IF EXISTS "Owners can update trips" ON public.trips;
DROP POLICY IF EXISTS "Owners can delete trips" ON public.trips;

-- Drop old recursive policies on trip_collaborators
DROP POLICY IF EXISTS "Owners can manage collaborators" ON public.trip_collaborators;
DROP POLICY IF EXISTS "Users can self-add via shared token" ON public.trip_collaborators;
DROP POLICY IF EXISTS "View collaborators of accessible trips" ON public.trip_collaborators;

-- Drop old recursive policies on trip_items
DROP POLICY IF EXISTS "Owners can manage trip items" ON public.trip_items;
DROP POLICY IF EXISTS "View items of accessible trips" ON public.trip_items;

-- Recreate trips policies (simple, no cross-table reference)
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Collaborators can view shared trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_collaborators c
      WHERE c.trip_id = trips.id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own trips"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their trips"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their trips"
  ON public.trips FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Recreate trip_collaborators policies (use helper function to break recursion)
CREATE POLICY "Owners manage collaborators"
  ON public.trip_collaborators FOR ALL
  TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid()))
  WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

CREATE POLICY "Users can view their collaborations"
  ON public.trip_collaborators FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can self-add as collaborator"
  ON public.trip_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Recreate trip_items policies (use helper functions)
CREATE POLICY "Owners can manage trip items"
  ON public.trip_items FOR ALL
  TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid()))
  WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

CREATE POLICY "Anyone with trip access can view items"
  ON public.trip_items FOR SELECT
  TO authenticated
  USING (public.is_trip_accessible(trip_id, auth.uid()));