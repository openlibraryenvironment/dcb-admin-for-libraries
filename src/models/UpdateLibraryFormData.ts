export interface UpdateLibraryFormData {
	fullName?: string;
	shortName?: string;
	abbreviatedName?: string;
	supportHours?: string;
	backupDowntimeSchedule?: string;
	// Patron-facing brand (N-1B) - see constants/discoveryBranding.
	//
	// Null is a value the mutation accepts, not an absence: dcb-service reads an explicit
	// null (or a blank string) on these fields as "clear it", which is how a library
	// removes a logo it uploaded by mistake. The stored value is nullable for the same
	// reason, so the form type has to carry it rather than narrow it away.
	brandLogoUrl?: string | null;
	brandLogoAlt?: string | null;
	defaultThemeName?: string | null;
	latitude?: number;
	longitude?: number;
	reason?: string;
	changeCategory?: string;
	changeReferenceUrl?: string;
}
