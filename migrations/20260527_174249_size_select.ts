import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_product_variants_size" AS ENUM('Small', 'Medium', 'Large', 'XL', 'XXL', 'One size fits most');
   UPDATE "product_variants"
     SET "size" = NULL
     WHERE "size" IS NOT NULL
       AND "size" NOT IN ('Small', 'Medium', 'Large', 'XL', 'XXL', 'One size fits most');
   ALTER TABLE "product_variants" ALTER COLUMN "size" SET DATA TYPE "public"."enum_product_variants_size" USING "size"::"public"."enum_product_variants_size";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "product_variants" ALTER COLUMN "size" SET DATA TYPE varchar;
   DROP TYPE "public"."enum_product_variants_size";`)
}
