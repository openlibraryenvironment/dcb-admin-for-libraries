import { UseNavigateResult } from "@tanstack/react-router";
import { Dispatch, SetStateAction } from "react";

export const handleTabChange = (
	event: React.SyntheticEvent,
	newValue: number,
	setTabIndex: Dispatch<SetStateAction<number>>,
	navigate: UseNavigateResult<string>,
	id?: string
) => {
	setTabIndex(newValue);
	switch (newValue) {
		case 0:
			navigate({ to: `/libraries/${id}` });
			break;
		case 1:
			navigate({ to: `/libraries/${id}/service` });

			break;
		case 2:
			navigate({ to: `/libraries/${id}/settings` });
			break;
		case 3:
			navigate({ to: `/libraries/${id}/referenceValueMappings/itemType` });
			break;
		case 4:
			navigate({ to: `/libraries/${id}/patronRequests/exception` });
			break;
		case 5:
			navigate({ to: `/libraries/${id}/supplierRequests/all` });
			break;
		case 6:
			navigate({ to: `/libraries/${id}/contacts` });
			break;
		case 7:
			navigate({ to: `/libraries/${id}/locations` });
	}
};

export const handlePatronRequestTabChange = (
	event: React.SyntheticEvent,
	newValue: number,
	navigate: UseNavigateResult<string>,
	setTabIndex: Dispatch<SetStateAction<number>>,
	id?: string
) => {
	setTabIndex(newValue);
	switch (newValue) {
		case 0:
			navigate({ to: `/libraries/${id}/patronRequests/exception` });
			break;
		case 1:
			navigate({ to: `/libraries/${id}/patronRequests/outOfSequence` });
			break;
		case 2:
			navigate({ to: `/libraries/${id}/patronRequests/active` });
			break;
		case 3:
			navigate({ to: `/libraries/${id}/patronRequests/completed` });
			break;
		case 4:
			navigate({ to: `/libraries/${id}/patronRequests/all` });
			break;
	}
};

export const handleSupplierRequestTabChange = (
	event: React.SyntheticEvent,
	newValue: number,
	navigate: UseNavigateResult<string>,
	setTabIndex: Dispatch<SetStateAction<number>>,
	id?: string
) => {
	setTabIndex(newValue);
	switch (newValue) {
		case 0:
			navigate({ to: `/libraries/${id}/supplierRequests/all` });
			break;
	}
};

export const handleMappingsTabChange = (
	event: React.SyntheticEvent,
	newValue: number,
	navigate: UseNavigateResult<string>,
	setTabIndex: Dispatch<SetStateAction<number>>,
	id?: string
) => {
	setTabIndex(newValue);
	switch (newValue) {
		case 0:
			navigate({ to: `/libraries/${id}/referenceValueMappings/itemType` });
			break;
		case 1:
			navigate({ to: `/libraries/${id}/numericRangeMappings/itemType` });
			break;
		case 2:
			navigate({ to: `/libraries/${id}/referenceValueMappings/location` });
			break;
		case 3:
			navigate({ to: `/libraries/${id}/referenceValueMappings/patronType` });
			break;
		case 4:
			navigate({ to: `/libraries/${id}/numericRangeMappings/patronType` });
			break;
		case 5:
			navigate({ to: `/libraries/${id}/referenceValueMappings/all` });
			break;
		case 6:
			navigate({ to: `/libraries/${id}/numericRangeMappings/all` });
			break;
	}
};

export const handleTopLevelPatronRequestTabChange = (
	event: React.SyntheticEvent,
	newValue: number,
	navigate: UseNavigateResult<string>,

	setTabIndex: Dispatch<SetStateAction<number>>
) => {
	setTabIndex(newValue);
	switch (newValue) {
		case 0:
			navigate({ to: `/patronRequests/exception` });
			break;
		case 1:
			navigate({ to: `/patronRequests/outOfSequence` });
			break;
		case 2:
			navigate({ to: `/patronRequests/active` });
			break;
		case 3:
			navigate({ to: `/patronRequests/completed` });
			break;
		case 4:
			navigate({ to: `/patronRequests/all` });
			break;
	}
};
