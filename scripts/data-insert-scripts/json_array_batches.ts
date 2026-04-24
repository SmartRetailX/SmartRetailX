import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, extname, join, resolve } from 'path';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function ensureDir(dirPath: string) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonArray(filePath: string): JsonValue[] {
  const raw = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as JsonValue;

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected a JSON array in ${filePath}`);
  }

  return parsed;
}

function writeJson(filePath: string, value: JsonValue) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function splitArray(inputFile: string, batchSize: number) {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error('Batch size must be a positive integer');
  }

  const absoluteInput = resolve(inputFile);
  const items = readJsonArray(absoluteInput);
  const inputName = basename(absoluteInput, extname(absoluteInput));
  const outputDir = resolve(join('scripts/data-insert-scripts/splitted-files', `${inputName}-${batchSize}`));

  ensureDir(outputDir);

  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize);
    const fileIndex = String(Math.floor(start / batchSize) + 1).padStart(3, '0');
    const outputFile = join(outputDir, `${inputName}-${fileIndex}.json`);
    writeJson(outputFile, batch);
  }

  console.log(`Split ${items.length} items into ${Math.ceil(items.length / batchSize)} files in ${outputDir}`);
}

function mergeArrays(inputDir: string, outputName?: string) {
  const absoluteInputDir = resolve(inputDir);
  const files = readdirSync(absoluteInputDir)
    .filter((file) => file.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (files.length === 0) {
    throw new Error(`No JSON files found in ${absoluteInputDir}`);
  }

  const merged: JsonValue[] = [];
  for (const file of files) {
    const currentItems = readJsonArray(join(absoluteInputDir, file));
    merged.push(...currentItems);
  }

  const dirName = basename(absoluteInputDir);
  const outputDir = resolve('scripts/data-insert-scripts/merged-files');
  ensureDir(outputDir);

  const outputFile = join(outputDir, outputName || `${dirName}-merged.json`);
  writeJson(outputFile, merged);

  console.log(`Merged ${files.length} files into ${outputFile}`);
}

function printUsage() {
  console.log('Usage:');
  console.log('  pnpm exec tsx scripts/data-insert-scripts/json_array_batches.ts split <input-file> <batch-size>');
  console.log('  pnpm exec tsx scripts/data-insert-scripts/json_array_batches.ts merge <input-folder> [output-file-name]');
}

function main() {
  const [, , command, targetPath, extraArg] = process.argv;

  if (!command || !targetPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (command === 'split') {
    splitArray(targetPath, Number(extraArg));
    return;
  }

  if (command === 'merge') {
    mergeArrays(targetPath, extraArg);
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main();
