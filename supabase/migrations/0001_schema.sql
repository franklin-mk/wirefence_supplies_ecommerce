-- WireFence Supplies: core schema + RLS
-- Run in Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role as enum ('customer', 'admin', 'driver');
create type order_status as enum (
  'PENDING_PAYMENT','PAID','FAILED','PROCESSING','IN_TRANSIT','DELIVERED','CANCELLED'
);
create type review_status as enum ('pending','approved','rejected');

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Catalog ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  sort_order int not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category_id uuid not null references public.categories(id),
  summary text not null default '',
  description text not null default '',
  specs jsonb not null default '{}'::jsonb,  -- {"Zinc coating":"60 g/m2", ...}
  images text[] not null default '{}',       -- Cloudinary URLs
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(summary,''))
  ) stored
);
create index products_search_idx on public.products using gin (search);
create index products_category_idx on public.products (category_id);

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,                       -- "2.5mm x 200m roll"
  sku text unique not null,
  price numeric(12,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  weight_kg numeric(10,2) not null default 0,
  attributes jsonb not null default '{}'::jsonb  -- gauge / roll_length / aperture
);
create index variants_product_idx on public.variants (product_id);

-- ---------- Wishlist ----------
create table public.wishlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- Reviews ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  body text not null,
  images text[] not null default '{}',
  status review_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index reviews_product_idx on public.reviews (product_id, status);

create table public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  parent_id uuid references public.review_replies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  is_owner boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------- Orders ----------
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('WF-' || nextval('public.order_number_seq')),
  user_id uuid not null references auth.users(id),
  status order_status not null default 'PENDING_PAYMENT',
  subtotal numeric(12,2) not null,
  transport_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  full_name text not null,
  phone text not null,
  whatsapp text not null,
  county text not null,
  sub_county text not null,
  drop_off_point text not null,
  drop_lat double precision,
  drop_lng double precision,
  transport_notes text,
  mpesa_checkout_id text,
  mpesa_merchant_request_id text,
  mpesa_receipt text,
  manual_payment_note text,
  driver_name text,
  driver_phone text,
  tracker_token text unique,          -- secret token for the driver's tracker link
  tracker_expires_at timestamptz,
  receipt_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_checkout_idx on public.orders (mpesa_checkout_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.variants(id),
  product_name text not null,
  variant_label text not null,
  unit_price numeric(12,2) not null,
  qty int not null check (qty > 0)
);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status order_status not null,
  note text,
  created_at timestamptz not null default now()
);

-- Latest driver position per order (upserted by the driver tracker API)
create table public.driver_locations (
  order_id uuid primary key references public.orders(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  speed double precision,
  updated_at timestamptz not null default now()
);

-- ---------- Admin OTP (hashed, single use) ----------
create table public.admin_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Updated-at trigger ----------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger orders_touch before update on public.orders
for each row execute function public.touch_updated_at();

-- ---------- Stock helper (atomic, used after payment confirmation) ----------
create or replace function public.decrement_stock_for_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.variants v
  set stock = greatest(v.stock - oi.qty, 0)
  from public.order_items oi
  where oi.order_id = p_order and oi.variant_id = v.id;
end $$;
revoke all on function public.decrement_stock_for_order(uuid) from public, anon, authenticated;

-- ---------- Rating summary view ----------
create view public.product_ratings as
select product_id, round(avg(rating)::numeric, 1) as rating_avg, count(*) as rating_count
from public.reviews where status = 'approved' group by product_id;

-- =====================================================================
-- Row Level Security
-- Server routes using the service-role key bypass RLS (M-Pesa callback,
-- driver tracker, OTP, receipts). Everything below protects direct
-- anon/authenticated access from the browser.
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.variants        enable row level security;
alter table public.wishlist_items  enable row level security;
alter table public.reviews         enable row level security;
alter table public.review_replies  enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.order_events    enable row level security;
alter table public.driver_locations enable row level security;
alter table public.admin_otps      enable row level security;  -- no policies: service role only

-- profiles
create policy "profile: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profile: update own (not role)" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- catalog: public read, admin write
create policy "categories: public read" on public.categories for select using (true);
create policy "categories: admin write" on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy "products: public read active" on public.products
  for select using (is_active or public.is_admin());
create policy "products: admin write" on public.products for all using (public.is_admin()) with check (public.is_admin());

create policy "variants: public read" on public.variants for select using (true);
create policy "variants: admin write" on public.variants for all using (public.is_admin()) with check (public.is_admin());

-- wishlist
create policy "wishlist: own" on public.wishlist_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reviews
create policy "reviews: read approved, own, or admin" on public.reviews
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "reviews: insert own as pending" on public.reviews
  for insert with check (user_id = auth.uid() and status = 'pending');
create policy "reviews: admin moderate" on public.reviews
  for update using (public.is_admin()) with check (public.is_admin());
create policy "reviews: admin delete" on public.reviews
  for delete using (public.is_admin());

create policy "replies: read if review visible" on public.review_replies
  for select using (
    exists (select 1 from public.reviews r where r.id = review_id
            and (r.status = 'approved' or r.user_id = auth.uid() or public.is_admin()))
  );
create policy "replies: insert own" on public.review_replies
  for insert with check (
    user_id = auth.uid() and (is_owner = false or public.is_admin())
  );
create policy "replies: admin delete" on public.review_replies
  for delete using (public.is_admin() or user_id = auth.uid());

-- orders: customers see only their own; writes happen server-side
create policy "orders: own or admin read" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
create policy "orders: admin update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

create policy "order_items: own or admin read" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id
            and (o.user_id = auth.uid() or public.is_admin()))
  );
create policy "order_events: own or admin read" on public.order_events
  for select using (
    exists (select 1 from public.orders o where o.id = order_id
            and (o.user_id = auth.uid() or public.is_admin()))
  );
create policy "driver_locations: own order or admin read" on public.driver_locations
  for select using (
    exists (select 1 from public.orders o where o.id = order_id
            and (o.user_id = auth.uid() or public.is_admin()))
  );

-- Realtime: customers subscribe to their order + driver position (RLS still applies)
alter publication supabase_realtime add table public.driver_locations;
alter publication supabase_realtime add table public.orders;
