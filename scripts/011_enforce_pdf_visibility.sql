-- Public clients may discover only public PDFs. Unlisted/private records are
-- loaded by trusted server routes, which apply direct-link/admin policy.
DROP POLICY IF EXISTS "Allow public read access on pdfs" ON public.pdfs;
DROP POLICY IF EXISTS "Public PDFs are readable" ON public.pdfs;

CREATE POLICY "Public PDFs are readable"
ON public.pdfs
FOR SELECT
TO anon, authenticated
USING (visibility = 'public');