export const getEntityText = (
	entityName: string,
	gridEdit?: boolean
): string => {
	switch (entityName) {
		case "functionalSetting":
		case "FunctionalSetting":
		case "consortiumFunctionalSettings":
			return "entities.functional_setting";
		case "ReferenceValueMapping":
		case "referencevaluemapping":
			return "entities.reference_value_mapping";
		case "NumericRangeMapping":
		case "numericrangemapping":
			return "entities.numeric_range_mapping";
		case "location":
		case "Location":
			if (gridEdit) return "entities.location";
			else {
				return entityName ?? "entities.location";
			}
		case "library":
			if (gridEdit) return "entities.library";
			else return entityName ?? "entities.library";
		case "person":
		case "Person":
		case "consortiumContact":
			return "entities.contact";
		default:
			return entityName.toLowerCase();
	}
};

type EntityType = Record<string, any>;

export function formatChangedFields<T extends EntityType>(
	changedFields: Partial<T>,
	originalFields: Partial<T>
): string {
	const formattedChanges: {
		new_values: Record<string, any>;
		old_values: Record<string, any>;
	} = {
		new_values: {},
		old_values: {},
	};

	Object.entries(changedFields).forEach(([key, newValue]) => {
		const oldValue = originalFields[key];

		formattedChanges.new_values[key] = newValue;
		formattedChanges.old_values[key] = oldValue;
	});

	return JSON.stringify(formattedChanges);
}
