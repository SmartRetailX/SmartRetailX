# Scripts

This folder contains the database bootstrap script and the product data import
utilities.

## Files

- `bootstrap-databases.mjs`: generates Prisma clients and pushes both Prisma
  schemas to the database
- `data-insert-scripts/json_array_batches.ts`: splits a large JSON array into
  smaller files and merges them back later
- `data-insert-scripts/db_push.ts`: imports product data from JSON into the main
  database

## Recommended flow

1. Bootstrap the database schemas
2. Prepare or split product JSON files if needed
3. Place the final import file in
   `scripts/data-insert-scripts/push-file/products.json`
4. Run the product import script

## Bootstrap the database

`bootstrap-databases.mjs` runs these steps:

- generates the main Prisma client
- pushes the main application schema
- generates the BI dashboard Prisma client
- pushes the BI dashboard schema

It loads variables from the repository root `.env` file before running. Shell
environment variables take precedence over `.env` values.

If `DATABASE_URL` is missing, copy `.env.example` to `.env` and set
`DATABASE_URL` before starting the backend.

### Run

```bash
pnpm db:init
```

### Dry run

```bash
pnpm db:init:dry-run
```

Use the dry run to confirm the commands before executing them.

## Split and merge JSON batches

`json_array_batches.ts` is a utility for working with one large JSON array file.

### What it does

- `split`: breaks one JSON array into smaller JSON array files
- `merge`: combines split files back into one JSON array

This is useful when you want to:

- process large datasets in smaller batches
- manually review or edit product data in smaller files
- merge batch files back into a single import file

### Split

```bash
pnpm exec tsx scripts/data-insert-scripts/json_array_batches.ts split scripts/data-insert-scripts/all_products.json 100
```

This creates files in:

```text
scripts/data-insert-scripts/splitted-files/all_products-100/
```

### Merge

```bash
pnpm exec tsx scripts/data-insert-scripts/json_array_batches.ts merge scripts/data-insert-scripts/splitted-files/all_products-100
```

This writes the merged array to:

```text
scripts/data-insert-scripts/merged-files/all_products-100-merged.json
```

You can also set a custom output file name:

```bash
pnpm exec tsx scripts/data-insert-scripts/json_array_batches.ts merge scripts/data-insert-scripts/splitted-files/all_products-100 products.json
```

### Output folders

- split output: `scripts/data-insert-scripts/splitted-files/`
- merged output: `scripts/data-insert-scripts/merged-files/`

### Notes

- the input file must contain a JSON array at the root
- merge reads all `.json` files in the target folder and combines them in sorted
  filename order

## Push product data to the database

`db_push.ts` imports product records into the main database.

### What it does

- reads `DATABASE_URL` from the environment or from `.env`
- reads product data from `scripts/data-insert-scripts/push-file/products.json`
- upserts categories into `core.categories`
- upserts products into `core.products`
- creates an initial stock entry in `core.stock_entries` when a product has no
  stock history yet

### Expected input fields

Each product object can contain:

- `category`
- `categoryId`
- `itemID`
- `itemCode`
- `name`
- `nameSi` optional
- `description` optional
- `descriptionSi` optional
- `price`
- `originalPrice` optional
- `uom` optional
- `imageUrl` optional
- `isAvailable` optional
- `discountPercentage` optional
- `stockQuantity` optional

### Default behavior

- if `description` is missing, the script builds one from `name` and `uom`
- if `stockQuantity` is missing, initial stock becomes `0` when
  `isAvailable === false`, otherwise `1`
- if a product already exists, product details are updated
- stock is only initialized when the product does not already have stock entry
  records

### Run

```bash
pnpm exec tsx scripts/data-insert-scripts/db_push.ts
```

### Import file path

Before running the import, place the final JSON array file here:

```text
scripts/data-insert-scripts/push-file/products.json
```

If you merged batched files with a different output name, rename or copy the
final file to `products.json` in that folder before running the import.
