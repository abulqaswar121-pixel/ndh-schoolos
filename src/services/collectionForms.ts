/** Fixed paper batches keep handwriting space identical on screen and paper. */
export function collectionPages<T>(rows: T[], perPage: number): T[][] {
  if (!Number.isInteger(perPage) || perPage < 1) throw new Error("Invalid page size");
  return Array.from({ length: Math.ceil(rows.length / perPage) }, (_, i) => rows.slice(i * perPage, (i + 1) * perPage));
}

export function parentSlipPages(learnerCount: number): number[][] {
  return collectionPages(Array.from({ length: Math.max(0, learnerCount) }, (_, i) => i), 3);
}