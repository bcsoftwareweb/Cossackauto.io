# Cossack Auto Solutions

React + Vite frontend for the Cossack Auto Solutions website. Reservation requests, optional reservation photos, and customer reviews use Supabase directly from the frontend.

## Supabase setup

1. In the Supabase Dashboard, open **SQL Editor**, paste the contents of `schema.sql`, and run it. This creates the tables, row-level security policies, private reservation-photo bucket, public site-media bucket, CMS content sections, and customer updates.
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

The Supabase anon key is intended for browser use only when row-level security is enabled and policies are configured. Never put a Supabase `service_role` or secret key in frontend code or environment variables prefixed with `VITE_`. The schema uses row-level security: visitors can submit reservations and reviews, read only approved reviews, and read published site sections. Reservation records and photos are not publicly readable. Site-media files are public to display on the website, but only admins can upload, update, or delete them.

The **Account** page linked from the navbar is the only sign-up form. An admin creates an account there like any other user, then the site owner verifies the person and manually promotes that profile in the Supabase SQL Editor. New profiles always receive the `customer` role, regardless of browser metadata, and signed-in users cannot change their own role. Admins use the separate, unlinked sign-in page at `/#/admin`; it opens the CMS only for profiles with the `admin` role.

After verifying the account, grant admin access by running this query with its email:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = lower('admin@example.com')
);
```

The profile table only lets a signed-in user read their own profile and update their name. It does not allow users to change their role. Admin access changes must be made by a trusted project owner.

The admin dashboard edits page headings, the home hero, the About profile, service cards, and custom text/image sections. It can also publish customer updates, approve or unpublish customer reviews, and view registered customers' names, email addresses, and signup dates. Customer details are returned through an admin-checked database function and are not exposed to regular users.

The Header & Navigation panel lets an admin change the site name, upload a logo, customize header colors, and add, edit, remove, publish, or reorder navbar links. Links can point to a website page or a safe external URL. The Pages panel creates and publishes custom pages; Manage Content adds and arranges text/image sections on those pages. Deleting a custom page also removes its sections and page-linked navbar item. Published site sections/pages and navbar links are public; published customer updates are visible only to signed-in users at `/#/updates`. Database policies enforce these access rules.

For an existing Supabase project, run the updated `schema.sql` in the SQL Editor to add the site settings, navigation, and custom-page tables and policies before using these CMS features.

New reviews have `is_published = false` and stay hidden until approved in the admin dashboard. To approve a review manually instead, use the Supabase SQL Editor:

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
