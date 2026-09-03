-- The review aggregate function is invoked by a database trigger only. It must
-- not be callable directly through the public REST/RPC API.
REVOKE EXECUTE ON FUNCTION public.update_pdf_review_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_pdf_review_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_pdf_review_stats() FROM authenticated;