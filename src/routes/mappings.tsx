import DataGrid from "@components/DataGrid/DataGrid";
import Loading from "@components/Loading/Loading";
import {
	LibrariesQueryData,
	ReferenceValueMappingsQueryData,
} from "@models/ReactQueryHelperTypes";
import { GridColDef } from "@mui/x-data-grid-premium";
import { getLibrary } from "@queries/getLibrary";
import { getMappings } from "@queries/getMappings";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import dayjs from "dayjs";
import request from "graphql-request";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/mappings")({
	component: RouteComponent,
});

function RouteComponent() {
	const auth = useAuth();
	const { t } = useTranslation();

	const { cfg } = useRouter().options.context as { cfg: any };
	const code = auth.user?.profile?.code;
	const id = auth.user?.profile?.libraryId;
	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth.user?.access_token}`,
		}),
		[auth.user?.access_token]
	);

	const { data: librariesData, isLoading: librariesLoading } =
		useQuery<LibrariesQueryData>({
			queryKey: ["libraryInfo", id, headers, code, cfg.VITE_DCB_API_BASE],
			queryFn: async () =>
				request(
					cfg.VITE_DCB_API_BASE + "/graphql",
					getLibrary,
					{
						query: code ? "agencyCode:" + code : "id:" + id, // Prefer to use the code, but fall back to the ID if needed
						pagesize: 10,
						pageno: 0,
						orderBy: "fullName",
						order: "DESC",
					},
					headers
				),
			// do the on success here
		});
	const library = librariesData?.libraries?.content?.[0];
	const libraryHostLmsCode = library?.agency?.hostLms?.code;

	const {
		data: mappingsData,
		isError,
		isLoading: mappingsLoading,
	} = useQuery<ReferenceValueMappingsQueryData>({
		queryKey: [
			"referenceValueMappings",
			headers,
			cfg.VITE_DCB_API_BASE,
			libraryHostLmsCode,
		],
		enabled: !!libraryHostLmsCode,

		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getMappings,
				{
					query:
						"fromContext:" +
						libraryHostLmsCode +
						" OR toContext:" +
						libraryHostLmsCode,
					pagesize: 200,
					pageno: 0,
					orderBy: "DESC",
					order: "lastImported",
				},
				headers
			),
	});
	const mappings = mappingsData?.referenceValueMappings?.content;

	const standardRefValueMappingColumns: GridColDef[] = [
		{
			field: "fromCategory",
			headerName: "Category",
			minWidth: 50,
			flex: 0.5,
			// filterOperators: standardFilters,
		},
		{
			field: "fromContext",
			headerName: "From context",
			minWidth: 50,
			flex: 0.5,
			// filterOperators: standardFilters,
		},
		{
			field: "fromValue",
			headerName: "From value",
			minWidth: 50,
			flex: 0.4,
			// filterOperators: standardFilters,
		},
		{
			field: "toContext",
			headerName: "To context",
			minWidth: 50,
			flex: 0.5,
			// filterOperators: standardFilters,
		},
		{
			field: "toValue",
			headerName: "To value",
			minWidth: 50,
			flex: 0.5,
			// filterOperators: standardFilters,
			editable: true,
			valueGetter: (value: any, row: { toValue: any }) => row?.toValue,
		},
		{
			field: "lastImported",
			headerName: "Last imported",
			minWidth: 100,
			flex: 0.5,
			// filterOperators: standardFilters,
			valueGetter: (value: any, row: { lastImported: any }) => {
				const lastImported = row.lastImported;
				const formattedDate = dayjs(lastImported).format("YYYY-MM-DD HH:mm");
				if (formattedDate == "Invalid Date") {
					return "";
				} else {
					return formattedDate;
				}
			},
		},
		{
			field: "toCategory",
			headerName: "To category",
			minWidth: 50,
			flex: 0.5,
			// filterOperators: standardFilters,
			editable: true,
			valueGetter: (value: any, row: { toCategory: any }) => row?.toCategory,
		},
	];

	if (mappingsLoading || librariesLoading) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("patron_request.title").toLowerCase(),
				})}
				subtitle={t("ui.info.wait")}
			/>
		);
	}

	console.log(mappings);
	return (
		<DataGrid
			rows={mappings ?? []}
			columns={standardRefValueMappingColumns}
			type="ReferenceValueMappings"
			identifier="ReferenceValueMappings"
			checkboxSelection={false}
			disableAggregation={true}
			disableHoverInteractions={true}
			disableRowGrouping={true}
			loading={mappingsLoading}
			listViewEnabled={false}
			noResultsText={t("audit.no_results")}
			pagination
			pivotingEnabled={false}
			toolbarVisible
			searchText="Search by mappings"
			scrollbarVisible={false}
		/>
	);
}
