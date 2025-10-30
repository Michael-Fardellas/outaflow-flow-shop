-- Add email length constraint and validation
ALTER TABLE public.email_signups 
ADD CONSTRAINT email_length_check CHECK (length(email) <= 255);

-- Add constraint to ensure email format is valid (basic format check)
ALTER TABLE public.email_signups 
ADD CONSTRAINT email_format_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');