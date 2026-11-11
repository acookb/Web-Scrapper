-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "scraped_pages" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "status" "PageStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "link_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scraped_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "links_page_id_idx" ON "links"("page_id");

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
