// TEMP: design-system smoke test page, delete once primitives are stable.

import Button from "@/components/ui/Button";

export default function DesignTestPage() {
  const variants = ["primary", "secondary", "ghost"] as const;
  const sizes = ["sm", "md", "lg"] as const;

  return (
    <main className="min-h-screen bg-neutral-cream p-8 text-neutral-ink">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-serif text-display mb-2">Design System</h1>
        <p className="font-sans text-small mb-12 text-neutral-ink/70">
          Button primitives across all variants, sizes, and states.
        </p>

        <section className="mb-16">
          <h2 className="font-serif text-h2 mb-6">Variants × Sizes</h2>
          <div className="space-y-8">
            {sizes.map((size) => (
              <div key={size} className="flex items-center gap-4">
                <span className="font-sans text-small w-12 font-medium uppercase text-neutral-ink/50">
                  {size}
                </span>
                {variants.map((variant) => (
                  <Button key={variant} variant={variant} size={size}>
                    {variant}
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-serif text-h2 mb-6">States</h2>
          <div className="flex flex-wrap gap-8">
            {variants.map((variant) => (
              <div key={variant} className="flex flex-col gap-3">
                <Button variant={variant} size="md">
                  Default
                </Button>
                <Button variant={variant} size="md" disabled>
                  Disabled
                </Button>
                <Button variant={variant} size="md" loading>
                  Loading
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
