type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * Renders a JSON-LD `<script>` tag with the given structured data.
 * Escapes `</` sequences in the JSON string to prevent XSS via values
 * that might contain `</script>`.
 */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
