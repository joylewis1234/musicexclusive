-- Ensure buckets exist and are public-read
insert into storage.buckets (id, name, public)
values
  ('track_covers', 'track_covers', true),
  ('track_audio', 'track_audio', true)
on conflict (id) do update
set public = excluded.public;

-- Public read policies (MVP)
drop policy if exists "Public read track_covers" on storage.objects;
create policy "Public read track_covers"
on storage.objects
for select
using (bucket_id = 'track_covers');

drop policy if exists "Public read track_audio" on storage.objects;
create policy "Public read track_audio"
on storage.objects
for select
using (bucket_id = 'track_audio');

-- Authenticated artist write access scoped to artists/{artist_profile_id}/...
-- NOTE: We bind folder[2] to an artist_profiles.id that belongs to the current user.
drop policy if exists "Artists insert track_covers" on storage.objects;
create policy "Artists insert track_covers"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'track_covers'
  and (storage.foldername(name))[1] = 'artists'
  and (storage.foldername(name))[2] in (
    select ap.id::text
    from public.artist_profiles ap
    where ap.user_id = auth.uid()
  )
);

drop policy if exists "Artists update track_covers" on storage.objects;
create policy "Artists update track_covers"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'track_covers'
  and (storage.foldername(name))[1] = 'artists'
  and (storage.foldername(name))[2] in (
    select ap.id::text
    from public.artist_profiles ap
    where ap.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'track_covers'
  and (storage.foldername(name))[1] = 'artists'
  and (storage.foldername(name))[2] in (
    select ap.id::text
    from public.artist_profiles ap
    where ap.user_id = auth.uid()
  )
);

drop policy if exists "Artists delete track_covers" on storage.objects;
create policy "Artists delete track_covers"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'track_covers'
  and (storage.foldername(name))[1] = 'artists'
  and (storage.foldername(name))[2] in (
    select ap.id::text
    from public.artist_profiles ap
    where ap.user_id = auth.uid()
  )
);

-- Audio bucket policies

drop policy if exists "Artists insert track_audio" on storage.objects;
create policy "Artists insert track_audio"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'track_audio'
  and (storage.foldername(name))[1] = 'artists'
  and (storage.foldername(name))[2] in (
    select ap.id::text
    from public.artist_profiles ap
    where ap.user_id = auth.uid()
  )
);

drop policy if exists "Artists update track_audio" on storage.objects;
create policy "Artists update track_audio"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'track_audio'
  and (storage.foldername(name))[1] = 'artists'
  and (storage.foldername(name))[2] in (
    select ap.id::text
    from public.artist_profiles ap
    where ap.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'track_audio'
  and (storage.foldername(name))[1] = 'artists'
  and (storage.foldername(name))[2] in (
    select ap.id::text
    from public.artist_profiles ap
    where ap.user_id = auth.uid()
  )
);

drop policy if exists "Artists delete track_audio" on storage.objects;
create policy "Artists delete track_audio"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'track_audio'
  and (storage.foldername(name))[1] = 'artists'
  and (storage.foldername(name))[2] in (
    select ap.id::text
    from public.artist_profiles ap
    where ap.user_id = auth.uid()
  )
);
