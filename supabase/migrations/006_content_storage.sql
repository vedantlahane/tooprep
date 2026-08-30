-- Private source-PDF bucket. Files are uploaded only through the authenticated
-- admin API; no browser/client storage policy is granted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('source-pdfs', 'source-pdfs', false, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 52428800,
      allowed_mime_types = array['application/pdf'];
