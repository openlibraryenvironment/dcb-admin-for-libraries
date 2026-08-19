import { Agency } from "./Agency";

export interface PatronIdentity {
	id: string; // ID!
	localId?: string | null;
	homeIdentity?: boolean | null;
	localBarcode?: string | null;
	localNames?: string | null;
	localPtype?: string | null;
	canonicalPtype?: string | null;
	localHomeLibraryCode?: string | null;
	lastValidated?: string | null;
	/**
	 * The library this patron belongs to, resolved from their home location during
	 * patron validation. The only place a request records it - patronHostlmsCode names
	 * the system, which on a shared one is every co-tenant rather than any of them.
	 */
	resolvedAgency?: Agency | null;
}
