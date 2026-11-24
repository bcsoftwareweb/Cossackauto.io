# Legacy backend

The current frontend connects directly to Supabase using the publishable key and the row-level security policies in the repository's `schema.sql`. It does not use this Express backend.

Do not add a Supabase service-role key to the frontend. If a trusted server is introduced later, keep service-role credentials on that server only.
