-- DropForeignKey
ALTER TABLE "apartments" DROP CONSTRAINT "apartments_apartemtnTypeId_fkey";

-- DropForeignKey
ALTER TABLE "apartments" DROP CONSTRAINT "apartments_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "master_jobs" DROP CONSTRAINT "master_jobs_jobId_fkey";

-- DropForeignKey
ALTER TABLE "master_jobs" DROP CONSTRAINT "master_jobs_masterIId_fkey";

-- DropForeignKey
ALTER TABLE "master_profiles" DROP CONSTRAINT "master_profiles_salaryTypeId_fkey";

-- DropForeignKey
ALTER TABLE "master_profiles" DROP CONSTRAINT "master_profiles_userId_fkey";

-- DropForeignKey
ALTER TABLE "master_ratings" DROP CONSTRAINT "master_ratings_masterProfileId_fkey";

-- DropForeignKey
ALTER TABLE "master_ratings" DROP CONSTRAINT "master_ratings_userId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_regionId_fkey";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_profiles" ADD CONSTRAINT "master_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_profiles" ADD CONSTRAINT "master_profiles_salaryTypeId_fkey" FOREIGN KEY ("salaryTypeId") REFERENCES "salary_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_jobs" ADD CONSTRAINT "master_jobs_masterIId_fkey" FOREIGN KEY ("masterIId") REFERENCES "master_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_jobs" ADD CONSTRAINT "master_jobs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_ratings" ADD CONSTRAINT "master_ratings_masterProfileId_fkey" FOREIGN KEY ("masterProfileId") REFERENCES "master_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_ratings" ADD CONSTRAINT "master_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_apartemtnTypeId_fkey" FOREIGN KEY ("apartemtnTypeId") REFERENCES "apartment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
