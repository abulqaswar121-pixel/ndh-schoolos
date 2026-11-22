ALTER TABLE public.school_portal_branding ADD COLUMN slug text;
CREATE UNIQUE INDEX school_portal_slug_unique ON public.school_portal_branding (slug) WHERE slug IS NOT NULL;
ALTER TABLE public.school_portal_branding ADD CONSTRAINT school_slug_format CHECK (slug IS NULL OR (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' AND slug NOT IN ('app','login','admin','platform','api','www','schoolos','ndh')));