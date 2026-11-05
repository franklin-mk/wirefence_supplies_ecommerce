-- Sample catalog. Replace image URLs with your Cloudinary uploads via /admin.

insert into public.categories (slug, name, description, sort_order) values
  ('barbed-wire','Barbed Wire','Galvanised and PVC-coated barbed wire for security and livestock fencing.',1),
  ('chain-link','Chain Link','Diamond-mesh chain link fencing in galvanised and PVC finishes.',2),
  ('weld-mesh','Weld Mesh','Rigid welded panels and rolls for construction, gates and enclosures.',3),
  ('gate-wire','Gate Wire','Binding, tension and gate wire for farm and industrial gates.',4),
  ('fencing-posts','Fencing Posts','Treated timber, steel and concrete posts, droppers and accessories.',5)
on conflict (slug) do nothing;

with c as (select id, slug from public.categories)
insert into public.products (slug, name, category_id, summary, description, specs, images) values
  ('galvanised-barbed-wire','Galvanised Barbed Wire',(select id from c where slug='barbed-wire'),
   'Double-strand hot-dip galvanised barbed wire, 4-point barbs.',
   'Heavy-duty barbed wire for perimeter security and livestock control. Hot-dip galvanised for long service life in humid and coastal conditions.',
   '{"Zinc coating":"60 g/m2","Barb spacing":"4 inch","Barb points":"4","Standard":"KS ISO 9001 compliant"}',
   '{}'),
  ('chain-link-fence-roll','Chain Link Fence Roll',(select id from c where slug='chain-link'),
   'Galvanised diamond-mesh chain link, 10 m rolls.',
   'Versatile chain link for schools, farms, sports grounds and residential compounds.',
   '{"Zinc coating":"40 g/m2","Mesh shape":"Diamond","Roll length":"10 m"}',
   '{}'),
  ('weld-mesh-panel-roll','Weld Mesh Roll',(select id from c where slug='weld-mesh'),
   'Electro-welded galvanised mesh, 30 m rolls.',
   'Rigid square-aperture weld mesh for gates, animal pens and security cages.',
   '{"Zinc coating":"30 g/m2","Roll length":"30 m","Finish":"Electro-galvanised"}',
   '{}'),
  ('gate-binding-wire','Gate & Binding Wire',(select id from c where slug='gate-wire'),
   'Soft annealed binding wire and high-tensile gate wire.',
   'For tying, tensioning and gate construction.',
   '{"Type":"Soft annealed","Finish":"Galvanised"}',
   '{}'),
  ('treated-fencing-post','Treated Fencing Post',(select id from c where slug='fencing-posts'),
   'CCB-treated cypress/eucalyptus posts.',
   'Pressure-treated posts rated against termites and rot.',
   '{"Treatment":"CCB pressure treated","Timber":"Eucalyptus"}',
   '{}')
on conflict (slug) do nothing;

insert into public.variants (product_id, label, sku, price, stock, weight_kg, attributes)
select p.id, v.label, v.sku, v.price, v.stock, v.weight_kg, v.attrs::jsonb
from public.products p
join (values
  ('galvanised-barbed-wire','2.0mm x 200m roll','BW-20-200',4200,50,25,'{"gauge":"2.0mm","roll_length":"200m"}'),
  ('galvanised-barbed-wire','2.5mm x 200m roll','BW-25-200',5600,40,32,'{"gauge":"2.5mm","roll_length":"200m"}'),
  ('galvanised-barbed-wire','2.5mm x 400m roll','BW-25-400',10800,20,64,'{"gauge":"2.5mm","roll_length":"400m"}'),
  ('chain-link-fence-roll','1.2m x 10m, 50mm aperture','CL-12-50',3800,35,18,'{"height":"1.2m","aperture":"50mm"}'),
  ('chain-link-fence-roll','1.8m x 10m, 50mm aperture','CL-18-50',5600,30,27,'{"height":"1.8m","aperture":"50mm"}'),
  ('weld-mesh-panel-roll','1.2m x 30m, 50x50mm','WM-12-50',9500,15,60,'{"height":"1.2m","aperture":"50x50mm"}'),
  ('gate-binding-wire','Binding wire 1.6mm, 25kg','GW-16-25',4500,60,25,'{"gauge":"1.6mm"}'),
  ('gate-binding-wire','Gate wire 3.0mm, 25kg','GW-30-25',5200,40,25,'{"gauge":"3.0mm"}'),
  ('treated-fencing-post','6ft x 4in post','FP-6-4',650,300,14,'{"length":"6ft","diameter":"4in"}'),
  ('treated-fencing-post','7ft x 5in post','FP-7-5',950,200,22,'{"length":"7ft","diameter":"5in"}')
) as v(slug,label,sku,price,stock,weight_kg,attrs) on p.slug = v.slug
on conflict (sku) do nothing;

-- Make yourself admin AFTER signing up once with your email:
-- update public.profiles set role='admin' where id = (select id from auth.users where email='you@example.com');
