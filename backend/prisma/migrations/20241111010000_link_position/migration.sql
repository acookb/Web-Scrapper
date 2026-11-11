-- Links inserted in one batch share the same created_at, so ordering by it is
-- not deterministic. Store the document order explicitly instead.
DROP INDEX "links_page_id_idx";

ALTER TABLE "links" ADD COLUMN "position" INTEGER;

UPDATE "links" AS l
SET "position" = numbered.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "page_id" ORDER BY "created_at", "id") - 1 AS rn
  FROM "links"
) AS numbered
WHERE l."id" = numbered."id";

ALTER TABLE "links" ALTER COLUMN "position" SET NOT NULL;

CREATE UNIQUE INDEX "links_page_id_position_key" ON "links"("page_id", "position");

CREATE INDEX "scraped_pages_created_at_idx" ON "scraped_pages"("created_at");
