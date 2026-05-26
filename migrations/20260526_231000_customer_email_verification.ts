import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" ADD COLUMN "email_verified_at" timestamp(3) with time zone;
   ALTER TABLE "customers" ADD COLUMN "email_verification_token" varchar;
   CREATE INDEX "customers_email_verification_token_idx" ON "customers" USING btree ("email_verification_token");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "customers_email_verification_token_idx";
   ALTER TABLE "customers" DROP COLUMN "email_verification_token";
   ALTER TABLE "customers" DROP COLUMN "email_verified_at";`)
}
