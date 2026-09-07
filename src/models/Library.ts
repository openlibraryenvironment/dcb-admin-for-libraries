import { Agency } from "./Agency";
import { HostLMS } from "./HostLMS";
import { LibraryGroupMember } from "./LibraryGroupMember";
import { Person } from "./Person";

export interface Library {
	id: string;
	fullName: string;
	shortName: string;
	abbreviatedName: string;
	agencyCode: string;
	supportHours: string;
	address: string;
	agency: Agency;
	secondHostLms: HostLMS;
	membership: [LibraryGroupMember];
	type: string;
	latitude: number;
	longitude: number;
	// V-11.1. The library's own site, and the desk that hears "discovery is broken".
	// Two different questions and rarely the same desk, so two fields; discovery renders
	// both in the footer of every page.
	patronWebsite?: string | null;
	// New in V9_0_008, which is on dcb-service main and in no release, so a deployment on
	// the 9.0.0 tag does not select it at all.
	supportUrl?: string | null;
	hostLmsConfiguration: string;
	discoverySystem: string;
	backupDowntimeSchedule: string;
	// Patron-facing brand (N-1B). Rendered by the discovery app, not by this one, and
	// nullable everywhere: a library that has set none is complete, not unfinished.
	brandLogoUrl?: string | null;
	brandLogoAlt?: string | null;
	// A name from the DISCOVERY app's theme registry, not this application's theme.
	defaultThemeName?: string | null;
	training: boolean;
	contacts: Person[];
	reason: string;
	changeCategory?: string;
	changeReferenceUrl?: string;
}
