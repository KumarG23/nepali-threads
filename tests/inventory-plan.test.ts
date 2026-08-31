import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  buildInventoryPlan,
  parseInventoryCsv,
} from "../scripts/inventory-plan";

const execFileAsync = promisify(execFile);

test("parses one sellable inventory row into normalized values", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    'romper-crimson,One Size Romper,Rompers,60.00,One-size romper.,silk,Hand wash cold,"one-size,festival",,One size fits most,Crimson,#9B2C2C,3,"front.jpg;back.jpg",yes,draft,First batch',
  ].join("\n");

  const [row] = parseInventoryCsv(csv);

  assert.deepEqual(row, {
    sourceRow: 2,
    productKey: "romper-crimson",
    productName: "One Size Romper",
    category: "Rompers",
    basePriceCents: 6000,
    description: "One-size romper.",
    material: "silk",
    care: "Hand wash cold",
    tags: ["one-size", "festival"],
    sku: null,
    size: "One size fits most",
    color: "Crimson",
    swatchHex: "#9B2C2C",
    quantity: 3,
    photoPaths: ["front.jpg", "back.jpg"],
    featured: true,
    status: "draft",
    notes: "First batch",
  });
});

test("rejects an intake file that is missing required columns", () => {
  const csv = "product_key,product_name\nromper,One Size Romper\n";

  assert.throws(
    () => parseInventoryCsv(csv),
    /Missing required columns: category, base_price_usd/
  );
});

test("rejects an intake file with no sellable rows", () => {
  const header =
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes";

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(header)),
    /Inventory intake contains no sellable rows/
  );
});

test("rejects an unterminated quoted CSV field", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    'romper,Romper,Rompers,60.00,"unfinished description',
  ].join("\n");

  assert.throws(() => parseInventoryCsv(csv), /Unterminated quoted CSV field/);
});

test("rejects a quote inside an unquoted CSV field", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    'romper,Rom"per",Rompers,60.00,Description,cotton,Cold wash,festival,NT-0001,Small,Crimson,,1,,no,draft,',
  ].join("\n");

  assert.throws(
    () => parseInventoryCsv(csv),
    /Row 2, column 2: unexpected quote in unquoted field/
  );
});

test("groups sellable rows by product and reports batch totals", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "mushroom-pants,Mushroom Print Pants,Bottoms,75.00,Relaxed pants.,cotton,Cold wash,printed,NT-0001,Medium,Green,#4F772D,2,green.jpg,yes,draft,",
    "mushroom-pants,Mushroom Print Pants,Bottoms,75.00,Relaxed pants.,cotton,Cold wash,printed,,XL,Blue,#4A6A8A,3,blue.jpg,yes,draft,",
  ].join("\n");

  const plan = buildInventoryPlan(parseInventoryCsv(csv));

  assert.deepEqual(plan.summary, {
    productCount: 1,
    sellableRowCount: 2,
    providedSkuCount: 1,
    missingSkuCount: 1,
    totalQuantity: 5,
  });
  assert.equal(plan.products[0].productKey, "mushroom-pants");
  assert.equal(plan.products[0].variants.length, 2);
  assert.deepEqual(plan.products[0].photoPaths, ["green.jpg", "blue.jpg"]);
});

test("rejects a row with a non-integer quantity", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,,,,,NT-0001,One size,Crimson,,1.5,,no,draft,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 2: quantity must be a non-negative integer/
  );
});

test("rejects a row with a blank quantity", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,,,,,NT-0001,One size,Crimson,,,,no,draft,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 2: quantity must be a non-negative integer/
  );
});

test("accepts zero inventory quantity", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,,,,,NT-0001,One size,Crimson,,0,,no,draft,",
  ].join("\n");

  assert.equal(
    buildInventoryPlan(parseInventoryCsv(csv)).summary.totalQuantity,
    0
  );
});

test("enforces the quantity cap", () => {
  const header =
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes";
  const csvForQuantity = (quantity: string) =>
    `${header}\nromper,Romper,Rompers,60.00,,,,,NT-0001,One size,Crimson,,${quantity},,no,draft,`;

  assert.equal(
    buildInventoryPlan(parseInventoryCsv(csvForQuantity("1000000"))).summary
      .totalQuantity,
    1_000_000
  );

  for (const quantity of ["1000001", "9007199254740992"]) {
    assert.throws(
      () => buildInventoryPlan(parseInventoryCsv(csvForQuantity(quantity))),
      /Row 2: quantity must not exceed 1,000,000 units/,
      quantity
    );
  }
});

test("rejects a row without a stable product key", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    ",Romper,Rompers,60.00,,,,,NT-0001,One size,Crimson,,1,,no,draft,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 2: product_key is required/
  );
});

test("rejects missing required product metadata", () => {
  const header =
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes";

  assert.throws(
    () =>
      buildInventoryPlan(
        parseInventoryCsv(
          `${header}\nromper,,Rompers,60.00,,,,,NT-0001,One size,Crimson,,1,,no,draft,`
        )
      ),
    /Row 2: product_name is required/
  );
  assert.throws(
    () =>
      buildInventoryPlan(
        parseInventoryCsv(
          `${header}\nromper,Romper,,60.00,,,,,NT-0001,One size,Crimson,,1,,no,draft,`
        )
      ),
    /Row 2: category is required/
  );
});

test("rejects a price with more than two decimal places", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.999,,,,,NT-0001,One size,Crimson,,1,,no,draft,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 2: base_price_usd must be a positive amount with at most two decimal places/
  );
});

test("enforces the price cap without unsafe cent conversion", () => {
  const header =
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes";
  const csvForPrice = (price: string) =>
    `${header}\nromper,Romper,Rompers,${price},,,,,NT-0001,One size,Crimson,,1,,no,draft,`;

  const [maximumPriceRow] = parseInventoryCsv(csvForPrice("100000.00"));
  assert.equal(maximumPriceRow.basePriceCents, 10_000_000);
  assert.doesNotThrow(() => buildInventoryPlan([maximumPriceRow]));

  for (const price of ["100000.01", "90071992547409.92"]) {
    assert.throws(
      () => buildInventoryPlan(parseInventoryCsv(csvForPrice(price))),
      /Row 2: base_price_usd must not exceed \$100,000\.00/,
      price
    );
  }
});

test("rejects an unsupported publication status", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,,,,,NT-0001,One size,Crimson,,1,,no,live,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 2: status must be draft, published, or archived/
  );
});

test("rejects an ambiguous featured value", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,,,,,NT-0001,One size,Crimson,,1,,maybe,draft,",
  ].join("\n");

  assert.throws(
    () => parseInventoryCsv(csv),
    /Row 2: featured must be yes or no/
  );
});

test("rejects duplicate provided SKUs", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,,,,,NT-0001,One size,Crimson,,1,,no,draft,",
    "pants,Pants,Bottoms,75.00,,,,,nt-0001,Medium,Green,,2,,no,draft,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 3: duplicate SKU NT-0001/
  );
});

test("rejects conflicting product metadata under one product key", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,,,,,NT-0001,One size,Crimson,,1,,no,draft,",
    "romper,Crimson Jumpsuit,Rompers,60.00,,,,,NT-0002,One size,Gold,,1,,no,draft,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 3: product_name conflicts with row 2 for product_key romper/
  );
});

test("rejects conflicting category under one product key", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,,,,,NT-0001,One size,Crimson,,1,,no,draft,",
    "romper,Romper,Dresses,60.00,,,,,NT-0002,One size,Gold,,1,,no,draft,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 3: category conflicts with row 2 for product_key romper/
  );
});

test("rejects conflicting base prices under one product key", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,,,,,NT-0001,One size,Crimson,,1,,no,draft,",
    "romper,Romper,Rompers,65.00,,,,,NT-0002,One size,Gold,,1,,no,draft,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 3: base_price_usd conflicts with row 2 for product_key romper/
  );
});

test("rejects conflicting publication status under one product key", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,,,,,NT-0001,One size,Crimson,,1,,no,draft,",
    "romper,Romper,Rompers,60.00,,,,,NT-0002,One size,Gold,,1,,no,published,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 3: status conflicts with row 2 for product_key romper/
  );
});

test("rejects conflicting description under one product key", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,First description,cotton,Cold wash,festival,NT-0001,Small,Crimson,,1,front.jpg,no,draft,First note",
    "romper,Romper,Rompers,60.00,Different description,cotton,Cold wash,festival,NT-0002,Large,Crimson,,1,back.jpg,no,draft,Second note",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 3: description conflicts with row 2 for product_key romper/
  );
});

test("rejects conflicting material under one product key", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,Description,cotton,Cold wash,festival,NT-0001,Small,Crimson,,1,,no,draft,",
    "romper,Romper,Rompers,60.00,Description,silk,Cold wash,festival,NT-0002,Large,Crimson,,1,,no,draft,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 3: material conflicts with row 2 for product_key romper/
  );
});

test("rejects conflicting care under one product key", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,Description,cotton,Cold wash,festival,NT-0001,Small,Crimson,,1,,no,draft,",
    "romper,Romper,Rompers,60.00,Description,cotton,Dry clean,festival,NT-0002,Large,Crimson,,1,,no,draft,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 3: care conflicts with row 2 for product_key romper/
  );
});

test("rejects conflicting tags under one product key", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,Description,cotton,Cold wash,festival,NT-0001,Small,Crimson,,1,,no,draft,",
    "romper,Romper,Rompers,60.00,Description,cotton,Cold wash,everyday,NT-0002,Large,Crimson,,1,,no,draft,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 3: tags conflicts with row 2 for product_key romper/
  );
});

test("rejects conflicting featured values under one product key", () => {
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,Description,cotton,Cold wash,festival,NT-0001,Small,Crimson,,1,,no,draft,",
    "romper,Romper,Rompers,60.00,Description,cotton,Cold wash,festival,NT-0002,Large,Crimson,,1,,yes,draft,",
  ].join("\n");

  assert.throws(
    () => buildInventoryPlan(parseInventoryCsv(csv)),
    /Row 3: featured conflicts with row 2 for product_key romper/
  );
});

test("rejects malformed CSV structure", () => {
  const header =
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes";
  const validFields = [
    "romper",
    "Romper",
    "Rompers",
    "60.00",
    "Description",
    "cotton",
    "Cold wash",
    "festival",
    "NT-0001",
    "Small",
    "Crimson",
    "",
    "1",
    "",
    "no",
    "draft",
    "",
  ];
  const cases = [
    {
      name: "characters after a closing quote",
      csv: `${header}\nromper,"Romper"x,Rompers,60.00,Description,cotton,Cold wash,festival,NT-0001,Small,Crimson,,1,,no,draft,`,
      error: /Row 2, column 2: unexpected character after closing quote/,
    },
    {
      name: "duplicate header names",
      csv: `${header},product_key\n${validFields.join(",")},duplicate`,
      error: /Duplicate header column: product_key/,
    },
    {
      name: "too many fields",
      csv: `${header}\n${validFields.join(",")},extra`,
      error: /Row 2: expected 17 fields but found 18/,
    },
    {
      name: "too few fields",
      csv: `${header}\n${validFields.slice(0, -1).join(",")}`,
      error: /Row 2: expected 17 fields but found 16/,
    },
  ];

  for (const malformed of cases) {
    assert.throws(
      () => parseInventoryCsv(malformed.csv),
      malformed.error,
      malformed.name
    );
  }
});

test("inventory plan command prints the validated grouped plan", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nepali-inventory-plan-"));
  const inputPath = join(directory, "inventory.csv");
  const csv = [
    "product_key,product_name,category,base_price_usd,description,material,care,tags,sku,size,color,swatch_hex,quantity,photo_paths,featured,status,notes",
    "romper,Romper,Rompers,60.00,,,,,,One size,Crimson,,3,,no,draft,",
  ].join("\n");

  try {
    await writeFile(inputPath, csv, "utf8");
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--import", "tsx", "scripts/inventory-plan.ts", inputPath],
      { cwd: process.cwd() }
    );
    const output = JSON.parse(stdout) as ReturnType<typeof buildInventoryPlan>;

    assert.deepEqual(output.summary, {
      productCount: 1,
      sellableRowCount: 1,
      providedSkuCount: 0,
      missingSkuCount: 1,
      totalQuantity: 3,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
