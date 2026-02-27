// patron requests for now. also should do mappings

import { RefObject, useState } from "react";
import request from "graphql-request";
import {
	GridApiPremium,
	gridVisibleColumnFieldsSelector,
} from "@mui/x-data-grid-premium";
import { getFileNameForExport } from "@helpers/dataGrid/getFileNameForExport";
import { convertFileToString } from "@helpers/dataGrid/convertFileToString";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { getLocations } from "@queries/getLocations";

interface UsePatronRequestExportProps {
	apiRef: RefObject<GridApiPremium | null>;
	dcbApiBase: string;
	headers: Record<string, string>;
	baseQuery: string;
	exportQuery: string;
	filterModel: any;
	sortModel: any;
	onExportSuccess: (message: string, count: number) => void;
	onExportError: (message: string) => void;
	type: string;
}

export const usePatronRequestExport = ({
	apiRef,
	dcbApiBase,
	headers,
	baseQuery,
	exportQuery,
	filterModel,
	sortModel,
	onExportSuccess,
	onExportError,
	type,
}: UsePatronRequestExportProps) => {
	const [exportProgress, setExportProgress] = useState({
		isExporting: false,
		progress: 0,
		totalRecords: 0,
	});

	const fetchAllExportData = async (exportMode: string) => {
		if (!apiRef?.current) return [];
		setExportProgress({ isExporting: true, progress: 0, totalRecords: 0 });
		const pageSize = 1000;
		let allContent: any[] = [];

		const exportQueryString =
			exportMode === "filtered"
				? (processGridFilterModel(filterModel, baseQuery, [
						"status",
						"description",
					]) ?? "")
				: baseQuery;

		try {
			const initialData = await request<any>( // also pass as prop
				`${dcbApiBase}/graphql`,
				exportQuery,
				{
					query: exportQueryString,
					pagesize: pageSize,
					pageno: 0,
					order: sortModel[0]?.field ?? "dateCreated",
					orderBy: sortModel[0]?.sort?.toUpperCase() ?? "DESC",
				},
				headers,
			);

			const totalSize = initialData?.patronRequests?.totalSize || 0;
			const totalPages = Math.ceil(totalSize / pageSize);
			allContent = initialData?.patronRequests?.content || [];

			setExportProgress((prev) => ({
				...prev,
				totalRecords: totalSize,
				progress: Math.round((allContent.length / totalSize) * 100),
			}));

			// Obtain all the pages that exist
			for (let page = 1; page < totalPages; page++) {
				const nextPageData = await request<any>(
					`${dcbApiBase}/graphql`,
					exportQuery,
					{
						query: exportQueryString,
						pagesize: pageSize,
						pageno: page,
						order: sortModel[0]?.field ?? "dateCreated",
						orderBy: sortModel[0]?.sort?.toUpperCase() ?? "DESC",
					},
					headers,
				);

				if (nextPageData?.patronRequests?.content) {
					allContent = [...allContent, ...nextPageData.patronRequests.content];
					setExportProgress((prev) => ({
						...prev,
						progress: Math.round((allContent.length / totalSize) * 100),
					}));
				}
			}

			// We have to put location data in

			const uniqueLocationCodes = Array.from(
				new Set(
					allContent
						.map((request: any) => request.pickupLocationCode)
						.filter(Boolean),
				),
			) as string[];

			if (uniqueLocationCodes.length > 0) {
				const locationQuery = uniqueLocationCodes
					.map((id) => `id:${id}`)
					.join(" OR ");

				try {
					const locationData = await request<any>(
						`${dcbApiBase}/graphql`,
						getLocations,
						{
							query: locationQuery,
							pageno: 0,
							pagesize: uniqueLocationCodes.length,
							order: "name",
							orderBy: "ASC",
						},
						headers,
					);

					const locationMap = new Map(
						locationData?.locations?.content?.map((location: any) => [
							location.id,
							location.name,
						]) || [],
					);

					allContent = allContent.map((item: any) => ({
						...item,
						pickupLocationCode:
							locationMap.get(item.pickupLocationCode) ||
							item.pickupLocationCode,
						pickupLocationName:
							locationMap.get(item.pickupLocationCode) ||
							item.pickupLocationCode,
					}));
				} catch (error) {
					console.error("Error fetching location names:", error);
				}
			}
		} catch (error) {
			console.error("Failed to fetch all data for export", error);
			throw error;
		}

		return allContent;
	};

	const handleExport = async (fileType: string, exportMode: string) => {
		if (!apiRef?.current) return;
		if (exportMode === "current") {
			apiRef.current.exportDataAsCsv();
			const currentCount =
				apiRef.current.state.pagination.paginationModel.pageSize;
			onExportSuccess(
				`Successfully exported ${currentCount} records.`,
				currentCount,
			);
			return;
		}
		if (exportMode === "print") {
			apiRef.current.exportDataAsPrint();
			const currentCount =
				apiRef.current.state.pagination.paginationModel.pageSize;
			onExportSuccess(
				`Successfully exported ${currentCount} records.`,
				currentCount,
			);
			return;
		}

		try {
			const allContent = await fetchAllExportData(exportMode);
			const delimiter = fileType === "csv" ? "," : "\t";
			const fileName = `${getFileNameForExport(type, filterModel)}.${fileType}`;

			const visibleColumns = gridVisibleColumnFieldsSelector(apiRef);
			const usefulColumns =
				exportMode === "all" || exportMode === "default"
					? null
					: visibleColumns.filter(
							(value) =>
								value !== "__detail_panel_toggle__" && value !== "__check__",
						);

			const dataString = convertFileToString(
				allContent,
				delimiter,
				"patronRequests",
				usefulColumns,
			);

			const blob = new Blob([dataString], {
				type: `text/${fileType};charset=utf-8;`,
			});
			const link = document.createElement("a");
			if (link.download !== undefined) {
				const url = URL.createObjectURL(blob);
				link.setAttribute("href", url);
				link.setAttribute("download", fileName);
				link.style.visibility = "hidden";
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);

				onExportSuccess(
					`Successfully exported ${allContent.length} records.`,
					allContent.length,
				);
			}
		} catch (error) {
			console.log(error);
			onExportError("Failed to export records.");
		} finally {
			setExportProgress({ isExporting: false, progress: 0, totalRecords: 0 });
		}
	};

	return {
		exportProgress,
		handleExport,
	};
};
// We could also do a promise based approach where we fetch all at once
// Fetch them all at the same time
// const pageRequests = [];
// for (let page = 1; page < totalPages; page++) {
// 	pageRequests.push(
// 		request<any>(
// 			`${dcbApiBase}/graphql`,
// 			getPatronRequests,
// 			{
// 				query: exportQueryString,
// 				pagesize: pageSize,
// 				pageno: page,
// 				order: sortModel[0]?.field ?? "dateCreated",
// 				orderBy: sortModel[0]?.sort?.toUpperCase() ?? "DESC",
// 			},
// 			headers
// 		)
// 	);
// }
// if (pageRequests.length > 0) {
// 	const pagesData = await Promise.all(pageRequests);

// 	pagesData.forEach((nextPageData) => {
// 		if (nextPageData?.patronRequests?.content) {
// 			allContent = [...allContent, ...nextPageData.patronRequests.content];
// 		}
// 	});

// 	// Update progress to 100% after all fetches complete
// 	setExportProgress((prev) => ({
// 		...prev,
// 		progress: Math.round((allContent.length / totalSize) * 100),
// 	}));
// }
