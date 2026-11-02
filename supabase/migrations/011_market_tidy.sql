-- =====================================================================
-- Market tidy-up after the Nov 2 review with Ben. Run after 010.
-- - Fitness stays inside the app (Fitologika brand): remove the outside
--   fitness links added in 009.
-- - "Books & Education" becomes "Condition Education & Recommendations".
-- =====================================================================
delete from public.marketplace_listings
where slug in ('free-move-your-way', 'free-exercise-db', 'free-wger', 'free-nia-exercise');

update public.marketplace_categories
set name = 'Condition Education & Recommendations',
    description = 'Guides, recommendations and books for blood sugar, blood pressure, heart health and more'
where slug = 'books-education';
