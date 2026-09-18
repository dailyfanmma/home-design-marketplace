export const PLATFORM_FEE_PCT = Number(process.env.PLATFORM_FEE_PCT ?? "0.15");

/** All money is stored in whole dollars for MVP simplicity -- swap to cents before real payments. */
export function splitBookingFee(designFee: number) {
  const platformFee = Math.round(designFee * PLATFORM_FEE_PCT);
  return {
    designFee,
    platformFee,
    totalCharge: designFee + platformFee,
  };
}
