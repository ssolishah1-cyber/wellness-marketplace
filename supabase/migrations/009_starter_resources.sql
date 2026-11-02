-- =====================================================================
-- Starter content: free public and open-source resources, so every Market
-- category has something useful before paid partners join. Not sponsored,
-- no affiliation, no tracking. Safe to run more than once (skips slugs
-- that already exist). Staff can edit or unpublish these in Admin.
-- =====================================================================

insert into public.marketplace_listings
  (category_id, slug, title, summary, description, listing_type, price_cents, price_verified, price_note,
   destination_url, cta_label, how_it_works, disclaimer, is_sponsored, status, published_at)
select c.id, v.slug, v.title, v.summary, v.description, v.listing_type::public.listing_type, 0, true, null,
       v.url, 'Open free resource', v.how, 'Independent public resource. Not affiliated with this app; we receive nothing for listing it.',
       false, 'published', now()
from (values
  -- Weight management
  ('weight-management', 'free-body-weight-planner', 'NIH Body Weight Planner',
   'Calculate the calories and activity needed to reach a goal weight by a target date.',
   'A research-based calculator from the National Institutes of Health that estimates calorie and activity changes to reach and stay at a goal weight.',
   'program', 'https://www.niddk.nih.gov/bwp', null),
  ('weight-management', 'free-niddk-weight', 'Weight management guides (NIDDK)',
   'Practical, evidence-based advice on healthy weight, eating and activity.',
   'Free guides from the National Institute of Diabetes and Digestive and Kidney Diseases on losing weight safely, keeping it off and eating well.',
   'education', 'https://www.niddk.nih.gov/health-information/weight-management', null),
  -- Books & education
  ('books-education', 'free-dietary-guidelines', 'Dietary Guidelines for Americans (free)',
   'The official U.S. nutrition guidelines, free to read and download.',
   'Science-based advice on what to eat and drink to promote health and reduce the risk of chronic disease, with tips for every life stage.',
   'education', 'https://www.dietaryguidelines.gov/', null),
  ('books-education', 'free-myplate', 'MyPlate: plans, recipes and tips',
   'Build a healthy plate, get a personalised food plan and browse free recipes from the USDA.',
   'MyPlate offers a personalised food plan, quizzes, tip sheets and the MyPlate Kitchen recipe collection.',
   'education', 'https://www.myplate.gov/', null),
  ('books-education', 'free-dash-plan', 'DASH eating plan (NHLBI)',
   'The heart-healthy eating plan for blood pressure, with menus and tips.',
   'The DASH plan from the National Heart, Lung, and Blood Institute: what to eat, sample menus and ways to lower sodium.',
   'education', 'https://www.nhlbi.nih.gov/education/dash-eating-plan', null),
  -- Wellness products (education about supplements, not sales)
  ('wellness-products', 'free-ods-supplement-facts', 'Dietary supplement fact sheets (NIH)',
   'Independent facts on vitamins, minerals and supplements before you buy anything.',
   'Fact sheets from the NIH Office of Dietary Supplements on what each supplement does, how much you need, safety and interactions with medicines.',
   'education', 'https://ods.od.nih.gov/factsheets/list-all/', null),
  -- Providers
  ('providers', 'free-find-dietitian', 'Find a registered dietitian',
   'Search for a credentialed nutrition expert near you or online.',
   'A directory from the Academy of Nutrition and Dietetics to find registered dietitian nutritionists by location, specialty and telehealth availability.',
   'provider', 'https://www.eatright.org/find-a-nutrition-expert', null),
  -- Events & programs
  ('events', 'free-national-dpp', 'National Diabetes Prevention Program',
   'A year-long lifestyle program, online or in person, proven to lower the risk of type 2 diabetes.',
   'CDC-recognised lifestyle change programs with a trained coach, offered in person and online. Many are covered by insurance.',
   'program', 'https://www.cdc.gov/diabetes-prevention/', null),
  -- Telehealth (general information until partner services are listed)
  ('telehealth', 'free-telehealth-guide', 'How to get ready for a telehealth visit',
   'What to expect from a virtual visit and how to prepare, from the U.S. Department of Health and Human Services.',
   'A plain-language guide to telehealth: how it works, what you need, privacy, and how to get the most from a virtual appointment.',
   'education', 'https://telehealth.hhs.gov/patients', null)
) as v(cat, slug, title, summary, description, listing_type, url, how)
join public.marketplace_categories c on c.slug = v.cat
on conflict (slug) do nothing;
