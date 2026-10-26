export interface HostLMS {
	id: string;
	code: string;
	name: string;
	lmsClientClass: string;
	clientConfig: any;
	/** DCB's last connection check of the system, as JSON (9.2.0): helpers/hostLmsLastPing. */
	lastPing?: unknown;
	itemSuppressionRulesetName: string;
	suppressionRulesetName: string;
}
