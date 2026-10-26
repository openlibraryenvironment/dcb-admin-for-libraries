import { HostLMS } from "./HostLMS";

export interface Agency {
	id: string;
	code: string;
	name: string;
	hostLms: HostLMS;
	authProfile: string;
	longitude: number;
	latitude: number;
	isSupplyingAgency: boolean;
	isBorrowingAgency: boolean;
	/** DCB's own limit on a patron's active requests. */
	maxConsortialLoans?: number | null;
	/** The library system's limit on a patron's holds, local ones included; null when not told (9.1.0). */
	maxLocalHolds?: number | null;
	description?: string; // Only on Live Availability
}
