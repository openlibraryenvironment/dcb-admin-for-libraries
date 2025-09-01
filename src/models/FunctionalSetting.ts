export interface FunctionalSetting {
	id: string;
	name: string;
	enabled: boolean;
	description?: string;
}

export enum FunctionalSettingStatus {
	ENABLED = 1,
	DISABLED = 0,
	NOT_PRESENT = -1,
}
