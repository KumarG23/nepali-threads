import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { RichText } from "@payloadcms/richtext-lexical/react";

import config from "@payload-config";

import Image from "@/components/ui/Image";
import type { Page } from "@/payload-types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "pages",
    where: { slug: { equals: slug } },
    limit: 1,
  });
  const page = result.docs[0] as Page | undefined;

  if (!page) {
    return { title: "Page not found" };
  }

  const firstImageBlock = (page.blocks ?? []).find(
    (block): block is Extract<Page["blocks"], Array<unknown>>[number] &
      Record<string, unknown> =>
      block.blockType === "image" &&
      typeof (block as Record<string, unknown>).image === "object"
  );
  const firstImageUrl =
    firstImageBlock &&
    typeof firstImageBlock.image === "object" &&
    firstImageBlock.image !== null &&
    "url" in firstImageBlock.image &&
    typeof firstImageBlock.image.url === "string"
      ? firstImageBlock.image.url
      : null;

  return {
    title: page.title,
    openGraph: {
      images: firstImageUrl ? [{ url: firstImageUrl }] : undefined,
    },
  };
}

export default async function PagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "pages",
    where: { slug: { equals: slug } },
    limit: 1,
  });
  const page = result.docs[0] as Page | undefined;

  if (!page) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <h1 className="font-serif text-display text-neutral-ink mb-12">
        {page.title}
      </h1>
      <div className="space-y-8">
        {page.blocks?.map((block, i) => {
          if (block.blockType === "richText") {
            return (
              <div key={i} className="prose">
                <RichText data={block.content} />
              </div>
            );
          }

          if (block.blockType === "image") {
            return (
              <figure key={i}>
                <Image
                  src={
                    typeof block.image === "object"
                      ? (block.image.url ?? "")
                      : ""
                  }
                  alt={
                    typeof block.image === "object"
                      ? (block.image.alt ?? "")
                      : ""
                  }
                  aspectRatio={
                    block.alignment === "full-width" ? "landscape" : "square"
                  }
                  rounded="lg"
                />
                {block.caption && (
                  <figcaption className="font-sans text-small text-neutral-ink/60 mt-2 text-center">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          }

          return null;
        })}
      </div>
    </article>
  );
}
