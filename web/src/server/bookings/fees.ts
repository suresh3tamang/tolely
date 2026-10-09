// The platform fee: a percentage of a booking's price that Tolely keeps.
//
// The percentage is copied onto each booking when it is created, so changing
// the fee later never changes jobs that are already booked. The mobile app uses
// the same formula (Booking.platformFee), so both always agree.

/** Fee in whole rupees, rounded to the nearest rupee. */
export function computeFee(price: number, percent: number): number {
  if (!(percent > 0) || !(price > 0)) return 0;
  return Math.round((price * percent) / 100);
}

/** What the supplier keeps. */
export function computeEarning(price: number, percent: number): number {
  return price - computeFee(price, percent);
}
