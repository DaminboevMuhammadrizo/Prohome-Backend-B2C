-- Region: split name/country into 3 languages
ALTER TABLE "regions"
  ADD COLUMN "name_uz" TEXT,
  ADD COLUMN "name_uz_cyrl" TEXT,
  ADD COLUMN "name_ru" TEXT,
  ADD COLUMN "country_name_uz" TEXT,
  ADD COLUMN "country_name_uz_cyrl" TEXT,
  ADD COLUMN "country_name_ru" TEXT;

UPDATE "regions"
SET
  "name_uz" = "name",
  "name_uz_cyrl" = "name",
  "name_ru" = "name",
  "country_name_uz" = "countryName",
  "country_name_uz_cyrl" = "countryName",
  "country_name_ru" = "countryName";

ALTER TABLE "regions"
  ALTER COLUMN "name_uz" SET NOT NULL,
  ALTER COLUMN "name_uz_cyrl" SET NOT NULL,
  ALTER COLUMN "name_ru" SET NOT NULL,
  ALTER COLUMN "country_name_uz" SET NOT NULL,
  ALTER COLUMN "country_name_uz_cyrl" SET NOT NULL,
  ALTER COLUMN "country_name_ru" SET NOT NULL;

ALTER TABLE "regions"
  DROP COLUMN "name",
  DROP COLUMN "countryName";

-- SalaryType: split name into 3 languages
ALTER TABLE "salary_types"
  ADD COLUMN "name_uz" TEXT,
  ADD COLUMN "name_uz_cyrl" TEXT,
  ADD COLUMN "name_ru" TEXT;

UPDATE "salary_types"
SET
  "name_uz" = "name",
  "name_uz_cyrl" = "name",
  "name_ru" = "name";

ALTER TABLE "salary_types"
  ALTER COLUMN "name_uz" SET NOT NULL,
  ALTER COLUMN "name_uz_cyrl" SET NOT NULL,
  ALTER COLUMN "name_ru" SET NOT NULL;

ALTER TABLE "salary_types"
  DROP COLUMN "name";

CREATE UNIQUE INDEX "salary_types_name_uz_key" ON "salary_types"("name_uz");
CREATE UNIQUE INDEX "salary_types_name_uz_cyrl_key" ON "salary_types"("name_uz_cyrl");
CREATE UNIQUE INDEX "salary_types_name_ru_key" ON "salary_types"("name_ru");

-- Job: split name into 3 languages
ALTER TABLE "jobs"
  ADD COLUMN "name_uz" TEXT,
  ADD COLUMN "name_uz_cyrl" TEXT,
  ADD COLUMN "name_ru" TEXT;

UPDATE "jobs"
SET
  "name_uz" = "name",
  "name_uz_cyrl" = "name",
  "name_ru" = "name";

ALTER TABLE "jobs"
  ALTER COLUMN "name_uz" SET NOT NULL,
  ALTER COLUMN "name_uz_cyrl" SET NOT NULL,
  ALTER COLUMN "name_ru" SET NOT NULL;

ALTER TABLE "jobs"
  DROP COLUMN "name";

CREATE UNIQUE INDEX "jobs_name_uz_key" ON "jobs"("name_uz");
CREATE UNIQUE INDEX "jobs_name_uz_cyrl_key" ON "jobs"("name_uz_cyrl");
CREATE UNIQUE INDEX "jobs_name_ru_key" ON "jobs"("name_ru");

-- ApartmentType: split name into 3 languages
ALTER TABLE "apartment_types"
  ADD COLUMN "name_uz" TEXT,
  ADD COLUMN "name_uz_cyrl" TEXT,
  ADD COLUMN "name_ru" TEXT;

UPDATE "apartment_types"
SET
  "name_uz" = "name",
  "name_uz_cyrl" = "name",
  "name_ru" = "name";

ALTER TABLE "apartment_types"
  ALTER COLUMN "name_uz" SET NOT NULL,
  ALTER COLUMN "name_uz_cyrl" SET NOT NULL,
  ALTER COLUMN "name_ru" SET NOT NULL;

ALTER TABLE "apartment_types"
  DROP COLUMN "name";

CREATE UNIQUE INDEX "apartment_types_name_uz_key" ON "apartment_types"("name_uz");
CREATE UNIQUE INDEX "apartment_types_name_uz_cyrl_key" ON "apartment_types"("name_uz_cyrl");
CREATE UNIQUE INDEX "apartment_types_name_ru_key" ON "apartment_types"("name_ru");

-- Apartment: split address/title/desc into 3 languages
ALTER TABLE "apartments"
  ADD COLUMN "adress_uz" TEXT,
  ADD COLUMN "adress_uz_cyrl" TEXT,
  ADD COLUMN "adress_ru" TEXT,
  ADD COLUMN "title_uz" TEXT,
  ADD COLUMN "title_uz_cyrl" TEXT,
  ADD COLUMN "title_ru" TEXT,
  ADD COLUMN "desc_uz" TEXT,
  ADD COLUMN "desc_uz_cyrl" TEXT,
  ADD COLUMN "desc_ru" TEXT;

UPDATE "apartments"
SET
  "adress_uz" = "adress",
  "adress_uz_cyrl" = "adress",
  "adress_ru" = "adress",
  "title_uz" = "title",
  "title_uz_cyrl" = "title",
  "title_ru" = "title",
  "desc_uz" = "desc",
  "desc_uz_cyrl" = "desc",
  "desc_ru" = "desc";

ALTER TABLE "apartments"
  ALTER COLUMN "adress_uz" SET NOT NULL,
  ALTER COLUMN "adress_uz_cyrl" SET NOT NULL,
  ALTER COLUMN "adress_ru" SET NOT NULL,
  ALTER COLUMN "title_uz" SET NOT NULL,
  ALTER COLUMN "title_uz_cyrl" SET NOT NULL,
  ALTER COLUMN "title_ru" SET NOT NULL;

ALTER TABLE "apartments"
  DROP COLUMN "adress",
  DROP COLUMN "title",
  DROP COLUMN "desc";
