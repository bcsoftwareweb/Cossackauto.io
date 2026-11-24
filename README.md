# Cossack Auto Solutions

React + Vite frontend for the Cossack Auto Solutions website. Reservation requests, optional reservation photos, and customer reviews use Supabase directly from the frontend.

## Supabase setup

1. In the Supabase Dashboard, open **SQL Editor**, paste the contents of `schema.sql`, and run it. This creates the tables, row-level security policies, and private photo storage bucket.
2. Copy `frontend/.env.example` to `frontend/.env.local` and set the project URL and publishable key:

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. Install dependencies and start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

The Supabase anon key is intended for browser use only when row-level security is enabled and policies are configured. Never put a Supabase `service_role` or secret key in frontend code or environment variables prefixed with `VITE_`. The schema uses row-level security: visitors can submit reservations and reviews, read only approved reviews, and upload photos to private storage. Reservation records and photos are not publicly readable.

The **Account** page has separate customer and admin sign-in/sign-up forms. If email confirmation is enabled in Supabase Auth, users must follow the confirmation link before signing in. Admin sign-up creates an account and marks it as an access request; it does not grant admin privileges. The profile trigger always assigns new accounts the `customer` role, regardless of browser metadata. The `requested_role` metadata is only a request indicator and must never be used for authorization.

Review admin access requests in the Supabase SQL Editor:

```sql
select p.id, u.email, p.full_name, p.created_at
from public.profiles as p
join auth.users as u on u.id = p.id
where u.raw_user_meta_data ->> 'requested_role' = 'admin'
  and p.role = 'customer'
order by p.created_at desc;
```

After verifying a request, grant admin access by running this query with the account email:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = lower('admin@example.com')
);
```

The profile table only lets a signed-in user read their own profile and update their name. It does not allow users to change their role. Admins sign in using the separate admin form. There is no admin dashboard yet.

New reviews have `is_published = false`. To approve a review, use the Supabase Dashboard or SQL Editor to set that row's `is_published` value to `true`. For example:

```sql
update public.reviews
set is_published = true
where id = 'review-uuid';
```

Reservation photos are limited to 10 MB and supported image types. They are stored in the private `reservation-photos` bucket; the website does not make them publicly accessible.

## Build and deploy

```powershell
cd frontend
npm run build
```

For GitHub Pages builds, the workflow reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the repository's Actions variables. The browser bundle necessarily contains this public key; database access must remain constrained by the policies in `schema.sql`.
