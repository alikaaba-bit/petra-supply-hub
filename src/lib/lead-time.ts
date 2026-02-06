import { subDays, addDays } from "date-fns";

/**
 * Calculate the order-by date for a purchase order.
 *
 * @param needByDate - The date by which the product is needed (expected arrival)
 * @param leadTimeDays - The brand's lead time in days
 * @returns The date by which the order should be placed (includes 5-day buffer)
 */
export function calculateOrderByDate(
  needByDate: Date,
  leadTimeDays: number
): Date {
  return subDays(needByDate, leadTimeDays + 5);
}

/**
 * Calculate the expected arrival date for a purchase order.
 *
 * @param orderDate - The date the order was placed
 * @param leadTimeDays - The brand's lead time in days
 * @returns The expected arrival date
 */
export function calculateExpectedArrival(
  orderDate: Date,
  leadTimeDays: number
): Date {
  return addDays(orderDate, leadTimeDays);
}
