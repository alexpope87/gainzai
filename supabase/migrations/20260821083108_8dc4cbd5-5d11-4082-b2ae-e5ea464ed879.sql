REVOKE EXECUTE ON FUNCTION public.bump_macro_estimate_hit(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_macro_estimate_hit(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;