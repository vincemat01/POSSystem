-- Supabase Storage bucket for product images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Authenticated users can upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images');

create policy "Authenticated users can update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images');

create policy "Anyone can view product images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');
