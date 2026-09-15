CREATE TABLE public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint, day)
);

GRANT ALL ON public.api_rate_limits TO service_role;

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages rate limits"
  ON public.api_rate_limits FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_api_rate_limits_updated_at
  BEFORE UPDATE ON public.api_rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.consume_rate_limit(_user_id uuid, _endpoint text, _limit integer)
RETURNS TABLE (allowed boolean, used integer, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _day date := (now() AT TIME ZONE 'utc')::date;
  _count integer;
BEGIN
  INSERT INTO public.api_rate_limits (user_id, endpoint, day, count)
  VALUES (_user_id, _endpoint, _day, 1)
  ON CONFLICT (user_id, endpoint, day)
  DO UPDATE SET count = public.api_rate_limits.count + 1, updated_at = now()
  WHERE public.api_rate_limits.count < _limit
  RETURNING public.api_rate_limits.count INTO _count;

  IF _count IS NULL THEN
    SELECT r.count INTO _count FROM public.api_rate_limits r
      WHERE r.user_id = _user_id AND r.endpoint = _endpoint AND r.day = _day;
    RETURN QUERY SELECT false, COALESCE(_count, _limit), 0;
  ELSE
    RETURN QUERY SELECT true, _count, GREATEST(_limit - _count, 0);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(uuid, text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.get_rate_limit_usage(_user_id uuid, _endpoint text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT r.count FROM public.api_rate_limits r
    WHERE r.user_id = _user_id AND r.endpoint = _endpoint
      AND r.day = (now() AT TIME ZONE 'utc')::date), 0);
$$;

REVOKE ALL ON FUNCTION public.get_rate_limit_usage(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_rate_limit_usage(uuid, text) TO service_role;