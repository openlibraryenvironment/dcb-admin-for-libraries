export interface ConfirmationType {
	open: boolean;
	onClose: any;
	onConfirm: (
		reason: string,
		changeCategory: string,
		changeReferenceUrl: string
	) => void;
	editInformation?: any;
	action: string;
	entityType?: string;
	entityName: string;
	gridEdit: boolean;
	// How many records a cleanup acts on
	count?: number;
	onExited?: () => void;
}
