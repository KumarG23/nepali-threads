export function isInventoryAvailable(
  inventoryCount: number | null | undefined,
  requestedQuantity: number
): boolean {
  if (typeof inventoryCount !== "number") return true;
  return inventoryCount >= requestedQuantity;
}
