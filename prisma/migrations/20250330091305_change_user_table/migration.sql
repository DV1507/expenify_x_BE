-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_social_login" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "password" DROP NOT NULL;
