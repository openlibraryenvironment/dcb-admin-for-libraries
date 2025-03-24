export interface ConfirmationType {
	open: boolean;
	onClose: any;
	onConfirm: (
		reason: string,
		changeReferenceUrl: string,
		changeCategory: string
	) => void;
	editInformation?: any;
	action: string;
	entityType: string;
	entityName: string;
	gridEdit: boolean;
}
