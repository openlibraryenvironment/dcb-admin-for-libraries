/** Filled as a share of requests that finished, or null when none did. */
export function fillRate(successful: number, failed: number): number | null {
	const total = successful + failed;
	return total === 0 ? null : (successful / total) * 100;
}
