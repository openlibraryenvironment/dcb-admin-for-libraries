/** LoadTodayCounts' answer: every alias carries a totalSize, as dcb-service's page does. */
export const todayCounts = (totals: Record<string, number | null>) =>
	Object.fromEntries(
		Object.entries(totals).map(([alias, totalSize]) => [alias, { totalSize }]),
	);

export const DEFAULT_TODAY_TOTALS = {
	readyForPickup: 4,
	inTransitToPickup: 7,
	toSupply: 12,
	returning: 3,
	failedBorrowed: 1,
	failedSupplied: 0,
	unfilled: 2,
	placed: 1234,
	received: 18,
};
