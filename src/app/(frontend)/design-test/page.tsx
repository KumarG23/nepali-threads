// TEMP: design-system smoke test page, delete once primitives are stable.

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

export default function DesignTestPage() {
  const variants = ["primary", "secondary", "ghost"] as const;
  const sizes = ["sm", "md", "lg"] as const;
  const cardVariants = ["elevated", "bordered", "flat"] as const;
  const cardPaddings = ["none", "sm", "md", "lg"] as const;
  const inputSizes = ["sm", "md", "lg"] as const;

  return (
    <main className="min-h-screen bg-neutral-cream p-8 text-neutral-ink">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-serif text-display mb-2">Design System</h1>
        <p className="font-sans text-small mb-12 text-neutral-ink/70">
          Storefront primitives across all variants, sizes, and states.
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

        <section className="mb-16">
          <h2 className="font-serif text-h2 mb-6">Cards: Variants</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {cardVariants.map((variant) => (
              <Card key={variant} variant={variant} padding="md">
                <h3 className="font-serif text-h3 mb-2">{variant}</h3>
                <p className="font-sans text-body text-neutral-ink/70">
                  A sample card with placeholder content to show how the{" "}
                  {variant} variant renders with real text inside.
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-serif text-h2 mb-6">Cards: Padding Scale</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {cardPaddings.map((padding) => (
              <Card key={padding} variant="elevated" padding={padding}>
                <span className="font-sans text-small font-medium uppercase text-neutral-ink/50">
                  padding="{padding}"
                </span>
                {padding !== "none" && (
                  <p className="font-sans text-body mt-2 text-neutral-ink/70">
                    Content inside the card.
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-serif text-h2 mb-6">Inputs: States</h2>
          <div className="mx-auto flex max-w-md flex-col gap-6">
            <Input
              label="Default"
              placeholder="Type something..."
            />
            <Input
              label="With hint"
              hint="This is a helpful hint about the field."
              placeholder="Type something..."
            />
            <Input
              label="With error"
              error="This field is required."
              placeholder="Type something..."
            />
            <Input
              label="Required"
              required
              placeholder="Type something..."
            />
            <Input
              label="Disabled"
              disabled
              placeholder="Cannot type here..."
            />
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-serif text-h2 mb-6">Inputs: Sizes</h2>
          <div className="mx-auto flex max-w-md flex-col gap-6">
            {inputSizes.map((s) => (
              <Input
                key={s}
                label={`Size: ${s}`}
                inputSize={s}
                placeholder={`${s} input`}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
