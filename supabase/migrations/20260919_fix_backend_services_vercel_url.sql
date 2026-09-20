begin;

alter table public.backend_services
  drop constraint if exists backend_services_vercel_url;

alter table public.backend_services
  add constraint backend_services_vercel_url check (
    deployment_url ~ '^https://[a-z0-9-]+([.][a-z0-9-]+)*[.]vercel[.]app$'
  );

commit;
