DROP POLICY IF EXISTS "Allow insert on reviews" ON public.reviews;

ALTER FUNCTION public.update_pdf_review_stats()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_temp;