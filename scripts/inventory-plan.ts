import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export type InventoryStatus = "draft" | "published" | "archived";

export const MAX_BASE_PRICE_CENTS = 10_000_000;
export const MAX_INVENTORY_QUANTITY = 1_000_000;

export type InventoryIntakeRow = {
  sourceRow: number;
  productKey: string;
  productName: string;
  category: string;
  basePriceCents: number;
  description: string;
  material: string;
  care: string;
  tags: string[];
  sku: string | null;
  size: string;
  color: string;
  swatchHex: string;
  quantity: number;
  photoPaths: string[];
  featured: boolean;
  status: InventoryStatus;
  notes: string;
};

const EXPECTED_COLUMNS = [
  "product_key",
  "product_name",
  "category",
  "base_price_usd",
  "description",
  "material",
  "care",
  "tags",
  "sku",
  "size",
  "color",
  "swatch_hex",
  "quantity",
  "photo_paths",
  "featured",
  "status",
  "notes",
] as const;

function parseCsvRecords(input: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        field += character;
      }
      continue;
    }

    if (afterQuote) {
      if (character === ",") {
        record.push(field);
        field = "";
        afterQuote = false;
      } else if (character === "\n") {
        record.push(field);
        records.push(record);
        record = [];
        field = "";
        afterQuote = false;
      } else if (character !== "\r") {
        throw new Error(
          `Row ${records.length + 1}, column ${record.length + 1}: unexpected character after closing quote`
        );
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) {
        throw new Error(
          `Row ${records.length + 1}, column ${record.length + 1}: unexpected quote in unquoted field`
        );
      }
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("Unterminated quoted CSV field");
  }

  if (field.length > 0 || record.length > 0 || afterQuote) {
    record.push(field);
    records.push(record);
  }

  return records.filter((candidate) => candidate.some((value) => value.trim() !== ""));
}

function splitList(value: string, delimiter: string): string[] {
  return value
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePriceCents(value: string): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return Number.NaN;

  const [dollars, fraction = ""] = value.split(".");
  const cents = Number(`${dollars}${fraction.padEnd(2, "0")}`);
  return cents > 0 ? cents : Number.NaN;
}

function parseQuantity(value: string): number {
  if (!/^\d+$/.test(value)) return Number.NaN;
  return Number(value);
}

function parseFeatured(value: string, sourceRow: number): boolean {
  const normalized = value.toLowerCase();
  if (["yes", "true", "1"].includes(normalized)) return true;
  if (["no", "false", "0"].includes(normalized)) return false;
  throw new Error(`Row ${sourceRow}: featured must be yes or no`);
}

export function parseInventoryCsv(input: string): InventoryIntakeRow[] {
  const [header, ...records] = parseCsvRecords(input);
  if (!header) return [];

  const normalizedHeader = header.map((column) => column.trim());
  const seenColumns = new Set<string>();
  for (const column of normalizedHeader) {
    if (seenColumns.has(column)) {
      throw new Error(`Duplicate header column: ${column}`);
    }
    seenColumns.add(column);
  }

  const presentColumns = new Set(normalizedHeader);
  const missingColumns = EXPECTED_COLUMNS.filter(
    (column) => !presentColumns.has(column)
  );
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
  }

  records.forEach((record, index) => {
    if (record.length !== header.length) {
      throw new Error(
        `Row ${index + 2}: expected ${header.length} fields but found ${record.length}`
      );
    }
  });

  const indexes = new Map(
    normalizedHeader.map((column, index) => [column, index])
  );
  const valueAt = (record: string[], column: (typeof EXPECTED_COLUMNS)[number]) =>
    record[indexes.get(column) ?? -1]?.trim() ?? "";

  return records.map((record, index) => ({
    sourceRow: index + 2,
    productKey: valueAt(record, "product_key"),
    productName: valueAt(record, "product_name"),
    category: valueAt(record, "category"),
    basePriceCents: parsePriceCents(valueAt(record, "base_price_usd")),
    description: valueAt(record, "description"),
    material: valueAt(record, "material"),
    care: valueAt(record, "care"),
    tags: splitList(valueAt(record, "tags"), ","),
    sku: valueAt(record, "sku").toUpperCase() || null,
    size: valueAt(record, "size"),
    color: valueAt(record, "color"),
    swatchHex: valueAt(record, "swatch_hex"),
    quantity: parseQuantity(valueAt(record, "quantity")),
    photoPaths: splitList(valueAt(record, "photo_paths"), ";"),
    featured: parseFeatured(valueAt(record, "featured"), index + 2),
    status: valueAt(record, "status") as InventoryStatus,
    notes: valueAt(record, "notes"),
  }));
}

export type InventoryPlan = {
  products: Array<{
    productKey: string;
    productName: string;
    category: string;
    basePriceCents: number;
    description: string;
    material: string;
    care: string;
    tags: string[];
    photoPaths: string[];
    featured: boolean;
    status: InventoryStatus;
    variants: InventoryIntakeRow[];
  }>;
  summary: {
    productCount: number;
    sellableRowCount: number;
    providedSkuCount: number;
    missingSkuCount: number;
    totalQuantity: number;
  };
};

export function buildInventoryPlan(rows: InventoryIntakeRow[]): InventoryPlan {
  if (rows.length === 0) {
    throw new Error("Inventory intake contains no sellable rows");
  }

  const productsByKey = new Map<string, InventoryPlan["products"][number]>();
  const seenSkus = new Set<string>();

  for (const row of rows) {
    if (!row.productKey) {
      throw new Error(`Row ${row.sourceRow}: product_key is required`);
    }
    if (!row.productName) {
      throw new Error(`Row ${row.sourceRow}: product_name is required`);
    }
    if (!row.category) {
      throw new Error(`Row ${row.sourceRow}: category is required`);
    }
    if (!Number.isInteger(row.basePriceCents) || row.basePriceCents <= 0) {
      throw new Error(
        `Row ${row.sourceRow}: base_price_usd must be a positive amount with at most two decimal places`
      );
    }
    if (
      !Number.isSafeInteger(row.basePriceCents) ||
      row.basePriceCents > MAX_BASE_PRICE_CENTS
    ) {
      throw new Error(
        `Row ${row.sourceRow}: base_price_usd must not exceed $100,000.00`
      );
    }
    if (!Number.isInteger(row.quantity) || row.quantity < 0) {
      throw new Error(
        `Row ${row.sourceRow}: quantity must be a non-negative integer`
      );
    }
    if (
      !Number.isSafeInteger(row.quantity) ||
      row.quantity > MAX_INVENTORY_QUANTITY
    ) {
      throw new Error(
        `Row ${row.sourceRow}: quantity must not exceed 1,000,000 units`
      );
    }
    if (!["draft", "published", "archived"].includes(row.status)) {
      throw new Error(
        `Row ${row.sourceRow}: status must be draft, published, or archived`
      );
    }
    if (row.sku) {
      if (seenSkus.has(row.sku)) {
        throw new Error(`Row ${row.sourceRow}: duplicate SKU ${row.sku}`);
      }
      seenSkus.add(row.sku);
    }

    const existing = productsByKey.get(row.productKey);
    if (existing) {
      if (existing.productName !== row.productName) {
        throw new Error(
          `Row ${row.sourceRow}: product_name conflicts with row ${existing.variants[0].sourceRow} for product_key ${row.productKey}`
        );
      }
      if (existing.category !== row.category) {
        throw new Error(
          `Row ${row.sourceRow}: category conflicts with row ${existing.variants[0].sourceRow} for product_key ${row.productKey}`
        );
      }
      if (existing.basePriceCents !== row.basePriceCents) {
        throw new Error(
          `Row ${row.sourceRow}: base_price_usd conflicts with row ${existing.variants[0].sourceRow} for product_key ${row.productKey}`
        );
      }
      if (existing.description !== row.description) {
        throw new Error(
          `Row ${row.sourceRow}: description conflicts with row ${existing.variants[0].sourceRow} for product_key ${row.productKey}`
        );
      }
      if (existing.material !== row.material) {
        throw new Error(
          `Row ${row.sourceRow}: material conflicts with row ${existing.variants[0].sourceRow} for product_key ${row.productKey}`
        );
      }
      if (existing.care !== row.care) {
        throw new Error(
          `Row ${row.sourceRow}: care conflicts with row ${existing.variants[0].sourceRow} for product_key ${row.productKey}`
        );
      }
      if (
        existing.tags.length !== row.tags.length ||
        existing.tags.some((tag, index) => tag !== row.tags[index])
      ) {
        throw new Error(
          `Row ${row.sourceRow}: tags conflicts with row ${existing.variants[0].sourceRow} for product_key ${row.productKey}`
        );
      }
      if (existing.featured !== row.featured) {
        throw new Error(
          `Row ${row.sourceRow}: featured conflicts with row ${existing.variants[0].sourceRow} for product_key ${row.productKey}`
        );
      }
      if (existing.status !== row.status) {
        throw new Error(
          `Row ${row.sourceRow}: status conflicts with row ${existing.variants[0].sourceRow} for product_key ${row.productKey}`
        );
      }
      existing.photoPaths = [
        ...new Set([...existing.photoPaths, ...row.photoPaths]),
      ];
      existing.variants.push(row);
      continue;
    }

    productsByKey.set(row.productKey, {
      productKey: row.productKey,
      productName: row.productName,
      category: row.category,
      basePriceCents: row.basePriceCents,
      description: row.description,
      material: row.material,
      care: row.care,
      tags: row.tags,
      photoPaths: row.photoPaths,
      featured: row.featured,
      status: row.status,
      variants: [row],
    });
  }

  return {
    products: [...productsByKey.values()],
    summary: {
      productCount: productsByKey.size,
      sellableRowCount: rows.length,
      providedSkuCount: rows.filter((row) => row.sku !== null).length,
      missingSkuCount: rows.filter((row) => row.sku === null).length,
      totalQuantity: rows.reduce((sum, row) => sum + row.quantity, 0),
    },
  };
}

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Usage: npm run inventory:plan -- <path-to-inventory.csv>");
  }

  const rows = parseInventoryCsv(await readFile(inputPath, "utf8"));
  const plan = buildInventoryPlan(rows);
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Inventory planning failed";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
