/** LoadHomeCounts' answer: every alias carries a totalSize, as dcb-service's page does. */
export const homeCounts = (totals: Record<string, number | null>) =>
	Object.fromEntries(
		Object.entries(totals).map(([alias, totalSize]) => [alias, { totalSize }]),
	);

export const DEFAULT_HOME_TOTALS = {
	readyForPickup: 4,
	inTransitToPickup: 7,
	notYetSent: 12,
	returning: 3,
	failedBorrowed: 1,
	failedSupplied: 0,
	unfilled: 2,
	placed: 1234,
	received: 18,
};
