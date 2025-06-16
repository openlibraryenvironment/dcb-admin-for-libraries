import { useRouter } from "@tanstack/react-router";
import axios from "axios";
import { useCallback } from "react";
import { useAuth } from "react-oidc-context";
import { ItemAvailabilityResponse } from "../../types/ItemAvailabilityResponse";
import {QueryFunction, useQuery} from "@tanstack/react-query";
import dayjs from "dayjs";
import { GridColDef } from "@mui/x-data-grid";
import Box from "@mui/material/Box";
import { DataGridPremium } from "@mui/x-data-grid-premium";
import {Card, Typography} from "@mui/material";
import { CustomLink } from "../CustomLink";
import MasterDetail from "../../components/MasterDetail/MasterDetail";
import { Route } from "../../routes/indexes/$indexCode/$recordId"
import {ClusterDetailResponse} from "../../types/ClusterDetailResponse";

interface CombinedData {
    availability: ItemAvailabilityResponse;
    clusterDetail: ClusterDetailResponse;
}

export default function ClusterRecordComponent() {
    const { cfg } = useRouter().options.context as { cfg: any};
    const { indexCode, recordId } = Route.useParams();
    const auth = useAuth();

    const fetchItemAvailability = useCallback(async () => {
        if (!auth.user?.access_token) {
            // set an alert instead
            throw new Error("No access token available");
        }

        const response = await axios.get(
            `${cfg.VITE_DCB_API_BASE}/items/availability`,
            {
                headers: {
                    Authorization: `Bearer ${auth.user.access_token}`,
                },
                params: {
                    clusteredBibId: recordId,
                },
            }
        );

        return response.data;
    }, [auth.user?.access_token, recordId]);

    const fetchClusterDetail = useCallback(async () => {
        if (!auth.user?.access_token) {
            // set an alert instead
            throw new Error("No access token available");
        }

        const response = await axios.get(
            `${cfg.VITE_DCB_SEARCH_BASE}/public/opac-inventory/instances/${recordId}`,
            {
                headers: {
                    Authorization: `Bearer ${auth.user.access_token}`,
                }
            }
        );

        return response.data;
    }, [auth.user?.access_token, recordId]);

    const fetchCombinedData: QueryFunction<CombinedData> = async () => {
        const [availability, clusterDetail] = await Promise.all([
            fetchItemAvailability(),
            fetchClusterDetail()
        ]);
        return { availability, clusterDetail };
    };

    const { data, isLoading, isError } = useQuery<CombinedData>({
        queryKey: ["combinedData", recordId],
        queryFn: fetchCombinedData,
        enabled: !!auth.user?.access_token,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const columns: GridColDef[] = [
        {
            field: "agencyCode",
            headerName: "Agency Code",
            flex: 0.3,
            filterable: false,
            sortable: false,
            valueGetter: (value, row) => row?.agency?.code ?? "-",
        },
        {
            field: "id",
            headerName: "Item ID",
            minWidth: 50,
            flex: 0.3,
            filterable: false,
            sortable: false,
        },
        {
            field: "status",
            headerName: "Status",
            minWidth: 100,
            filterable: false,
            sortable: false,
            flex: 0.4,
            valueGetter: (value, row) => row?.status?.code,
        },
        {
            field: "isRequestable",
            headerName: "Requestable",
            minWidth: 50,
            type: "boolean",
            filterable: false,
            sortable: false,
            flex: 0.3,
        },
        {
            field: "isSuppressed",
            headerName: "Suppressed",
            minWidth: 50,
            type: "boolean",
            filterable: false,
            sortable: false,
            flex: 0.3,
        },
        {
            field: "holdCount",
            headerName: "Hold Count",
            minWidth: 50,
            type: "number",
            filterable: false,
            sortable: false,
            flex: 0.3,
        },
        {
            field: "dueDate",
            headerName: "Date Due",
            minWidth: 100,
            flex: 0.4,
            filterable: false,
            sortable: false,
            valueGetter: (value: any, row: { dueDate: string | null }) => {
                const dateDue = row?.dueDate;
                return dateDue ? dayjs(dateDue).format("YYYY-MM-DD") : "-";
            },
        },
        {
            field: "availabilityDate",
            headerName: "Date Available",
            minWidth: 100,
            flex: 0.4,
            filterable: false,
            sortable: false,
            valueGetter: (value: any, row: { availabilityDate: string | null }) => {
                const dateAvailable = row?.availabilityDate;
                return dateAvailable ? dayjs(dateAvailable).format("YYYY-MM-DD") : "-";
            },
        },
        {
            field: "canonicalItemType",
            headerName: "Supplier Type",
            minWidth: 100,
            filterable: false,
            sortable: false,
            flex: 0.5,
        },
    ];

    if (isError) {
        // Sub in Error component
        return (
            <Box sx={{ width: "100%" }}>
                <Card sx={{ p: 4, textAlign: "center", my: 2 }}>
                    <Typography variant="h6">Error</Typography>
                    <Typography>
                        There was an issue retrieving the items data. Please try again
                        later.
                    </Typography>
                </Card>
            </Box>
        );
    }

    // deprecate auto height and adornments, use input props instead
    // Sub in breadcrumbs and an actual layout when we can
    return (
        <Box sx={{ width: "100%" }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Items for Cluster: {recordId}
            </Typography>

            <h1>{data?.clusterDetail.title}</h1>

            {data?.clusterDetail.description} <br/>

            <pre>{JSON.stringify(data?.clusterDetail,null,2)}</pre>

            <Box sx={{ my: 2 }}>
                <CustomLink to="/indexes/$indexCode" params={{ indexCode: indexCode }}>« Back to Shared Index</CustomLink>
                {" | "}
                <CustomLink to="/indexes/$indexCode/$recordId" params={{ indexCode: indexCode, recordId: recordId }}>
                    View Cluster Details
                </CustomLink>
            </Box>
            <DataGridPremium
                loading={isLoading}
                rows={data?.availability?.itemList ?? []}
                columns={columns}
                autoHeight
                // getRowId={(row: { id: string }) => row.id}
                sx={{ border: 0 }}
                disableAggregation={true}
                disableRowGrouping={true}
                getDetailPanelContent={({ row }) => (
                    <MasterDetail type="items" row={row} />
                )}
                slots={{
                    noRowsOverlay: () => (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                height: "100%",
                                p: 2,
                            }}>
                            No items available for this cluster
                        </Box>
                    ),
                }}
            />
        </Box>
    );
}
