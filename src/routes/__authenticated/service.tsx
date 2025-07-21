import { createFileRoute, useRouter } from "@tanstack/react-router";
import Grid from "@mui/material/Grid";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";
import { useQuery } from "@tanstack/react-query";
import request from "graphql-request";
import { getLibrary } from "@queries/getLibrary";
import { Library } from "@models/Library";
import { HostLMS } from "@models/HostLMS";
import { getILS } from "@helpers/getILS";
import Typography from "@mui/material/Typography";
import RenderAttribute from "@components/RenderAttribute/RenderAttribute";
import { Divider, Stack } from "@mui/material";
import FormatArrayAsList from "@components/FormatArrayAsList/FormatArrayAsList";
import PrivateData from "@components/PrivateData/PrivateData";
import { useMemo } from "react";

export const Route = createFileRoute("/__authenticated/service")({
	component: ServiceComponent,
});

function ServiceComponent() {
	const auth = useAuth();
	const { cfg } = useRouter().options.context as { cfg: any };
	const { t } = useTranslation();

	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth.user?.access_token}`,
		}),
		[auth.user?.access_token]
	);
	const id = auth.user?.profile?.libraryId;

	// does this need a different key
	const { data } = useQuery({
		queryKey: ["libraryInfo", id, headers, cfg.VITE_DCB_API_BASE],
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getLibrary,
				{
					query: "id:" + id,
					pagesize: 10,
					pageno: 0,
					orderBy: "fullName",
					order: "DESC",
				},
				headers
			),
		// do the on success here
	});
	//@ts-expect-error TYPING - needs fixing
	const library: Library = data?.libraries?.content?.[0];
	const firstHostLms: HostLMS = library?.agency?.hostLms;
	const secondHostLms: HostLMS = library?.secondHostLms;
	const ils: string = getILS(library?.agency?.hostLms?.lmsClientClass);

	// all pages will need error and loading states too!
	// do we want to do tabs for first, second host lms?
	return (
		<Grid
			container
			spacing={{ xs: 2, md: 3 }}
			columns={{ xs: 4, sm: 8, md: 12 }}>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography variant="accordionSummary">
					{t("nav.library.service")}
				</Typography>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("library.service.systems.ils")}
					</Typography>
					<RenderAttribute attribute={ils} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("library.service.systems.discovery")}
					</Typography>
					<RenderAttribute attribute={library?.discoverySystem} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("library.service.systems.patron_site")}
					</Typography>
					{library?.patronWebsite ? (
						<RenderAttribute
							attribute={library?.patronWebsite}
							title="Link to patron website"
							type="url"
						/>
					) : (
						<Typography variant="attributeText">-</Typography>
					)}
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Typography variant="h3" fontWeight={"bold"}>
					{t("library.config.patronAuth.title")}
				</Typography>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("library.config.patronAuth.auth_profile")}
					</Typography>
					<RenderAttribute attribute={library?.agency?.authProfile} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("hostlms.configuration")}
					</Typography>
					<RenderAttribute attribute={library?.hostLmsConfiguration} />
				</Stack>
			</Grid>
			{firstHostLms ? (
				<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
					<Divider aria-hidden="true"></Divider>
				</Grid>
			) : null}
			{firstHostLms ? (
				<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
					<Typography variant="h3" fontWeight={"bold"}>
						{t("library.service.hostlms_title", {
							name: firstHostLms?.name,
						})}
					</Typography>
				</Grid>
			) : null}
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">{t("hostlms.name")}</Typography>
					<RenderAttribute attribute={firstHostLms?.name} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">{t("hostlms.code")}</Typography>
					<RenderAttribute attribute={firstHostLms?.code} />
				</Stack>
			</Grid>
			{/* Handle multi-roles and separate them */}
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">{t("hostlms.roles")}</Typography>
					{<FormatArrayAsList roles={firstHostLms?.clientConfig?.["roles"]} />}
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">{t("hostlms.id")}</Typography>
					<RenderAttribute attribute={firstHostLms?.id} />
				</Stack>
			</Grid>

			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("hostlms.client_config.ingest")}
					</Typography>
					<RenderAttribute
						attribute={String(firstHostLms?.clientConfig?.ingest)}
					/>
				</Stack>
			</Grid>
			{/* Suppression rulesets */}
			{firstHostLms?.suppressionRulesetName != null && (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.bibSuppressionRulesetName")}
						</Typography>
						<Typography variant="attributeText">
							<RenderAttribute
								attribute={firstHostLms?.suppressionRulesetName}
							/>
						</Typography>
					</Stack>
				</Grid>
			)}
			{firstHostLms?.itemSuppressionRulesetName != null && (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.itemSuppressionRulesetName")}
						</Typography>
						<Typography variant="attributeText">
							<RenderAttribute
								attribute={firstHostLms?.itemSuppressionRulesetName}
							/>
						</Typography>
					</Stack>
				</Grid>
			)}

			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("library.service.environments.api")}
					</Typography>
					<RenderAttribute
						attribute={firstHostLms?.clientConfig?.["base-url"]}
						title={firstHostLms?.clientConfig?.["base-url"]}
						type="url"
					/>
				</Stack>
			</Grid>

			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("hostlms.client_config.context_hierarchy")}
					</Typography>
					<FormatArrayAsList
						roles={firstHostLms?.clientConfig?.contextHierarchy}
					/>
				</Stack>
			</Grid>

			{/* 'API Key' has many different guises on clientConfig: for FOLIO libraries it's simple*/}
			{firstHostLms?.clientConfig?.apikey ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<PrivateData
						clientConfigType={t("library.service.environments.api_key")}
						hiddenTextValue={firstHostLms?.clientConfig?.apikey}
						id="lib-prod-env-api-key-1"
					/>
				</Grid>
			) : null}

			{/* For Polaris libraries it's the 'access key' attribute*/}
			{firstHostLms?.clientConfig?.["access-key"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<PrivateData
						clientConfigType={t("library.service.environments.api_key")}
						hiddenTextValue={firstHostLms?.clientConfig?.["access-key"]}
						id="lib-prod-env-api-key-1"
					/>
				</Grid>
			) : null}

			{/* And for Sierra libraries it is the 'key' attribute*/}
			{firstHostLms?.clientConfig?.key ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<PrivateData
						clientConfigType={t("library.service.environments.api_key")}
						hiddenTextValue={firstHostLms?.clientConfig?.key}
						id="lib-prod-env-api-key-1"
					/>
				</Grid>
			) : null}

			{firstHostLms?.clientConfig?.secret ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<PrivateData
						clientConfigType={t("library.service.environments.api_secret")}
						hiddenTextValue={firstHostLms?.clientConfig?.secret}
						id="lib-prod-env-api-secret-1"
					/>
				</Grid>
			) : null}

			{firstHostLms?.clientConfig?.defaultAgency ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.default_agency")}
						</Typography>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.defaultAgency}
						/>
					</Stack>
				</Grid>
			) : null}

			{/* Sierra specific values*/}

			{firstHostLms?.clientConfig?.holdPolicy ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.hold_policy")}
						</Typography>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.holdPolicy}
						/>
					</Stack>
				</Grid>
			) : null}

			{firstHostLms?.clientConfig?.["page-size"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.page_size")}
						</Typography>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["page-size"]}
						/>
					</Stack>
				</Grid>
			) : null}

			{/* Polaris-specific values*/}

			{firstHostLms?.clientConfig?.["domain-id"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("library.service.environments.polaris_domain")}
						</Typography>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["domain-id"]}
						/>
					</Stack>
				</Grid>
			) : null}
			{firstHostLms?.clientConfig?.["domain-id"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("library.service.environments.polaris_username")}
						</Typography>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["staff-username"]}
						/>
					</Stack>
				</Grid>
			) : null}
			{firstHostLms?.clientConfig?.["staff-password"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<PrivateData
						clientConfigType={t(
							"library.service.environments.polaris_password"
						)}
						hiddenTextValue={firstHostLms?.clientConfig?.["staff-password"]}
						id="lib-prod-env-api-polaris-password"
					/>
				</Grid>
			) : null}
			{firstHostLms?.clientConfig?.services?.["organisation-id"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("library.service.environments.polaris_org_id")}
						</Typography>
						<RenderAttribute
							attribute={
								firstHostLms?.clientConfig?.services?.["organisation-id"]
							}
						/>
					</Stack>
				</Grid>
			) : null}

			{/* FOLIO Specific values: folio-tenant, metadata-prefix, record_syntax, user-base-url*/}

			{firstHostLms?.clientConfig?.["folio-tenant"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.folio_tenant")}
						</Typography>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["folio-tenant"]}
						/>
					</Stack>
				</Grid>
			) : null}

			{firstHostLms?.clientConfig?.["metadata-prefix"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.metadata")}
						</Typography>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["metadata-prefix"]}
						/>
					</Stack>
				</Grid>
			) : null}

			{firstHostLms?.clientConfig?.["record-syntax"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.record_syntax")}
						</Typography>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["record-syntax"]}
						/>
					</Stack>
				</Grid>
			) : null}

			{firstHostLms?.clientConfig?.["user-base-url"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.user_base_url")}
						</Typography>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["user-base-url"]}
							title={firstHostLms?.clientConfig?.["user-base-url"]}
							type="url"
						/>
					</Stack>
				</Grid>
			) : null}

			{/* Second Host LMS section - if exists - conditionally render */}
			{secondHostLms ? (
				<Grid size={{ xs: 4, sm: 8, md: 12 }}>
					<Divider aria-hidden="true"></Divider>
				</Grid>
			) : null}
			{secondHostLms ? (
				<Grid size={{ xs: 4, sm: 8, md: 12 }}>
					<Typography variant="h3" fontWeight={"bold"}>
						{t("library.service.hostlms_title", {
							name: secondHostLms?.name,
						})}
					</Typography>
				</Grid>
			) : null}
			{secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.name")}
						</Typography>
						<RenderAttribute attribute={secondHostLms?.name} />
					</Stack>
				</Grid>
			) : null}
			{secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.code")}
						</Typography>
						<RenderAttribute attribute={secondHostLms?.code} />
					</Stack>
				</Grid>
			) : null}
			{secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.roles")}
						</Typography>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["roles"]}
						/>
					</Stack>
				</Grid>
			) : null}
			{secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">{t("hostlms.id")}</Typography>
						<RenderAttribute attribute={secondHostLms?.id} />
					</Stack>
				</Grid>
			) : null}
			{secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.ingest")}
						</Typography>
						<RenderAttribute
							attribute={String(secondHostLms?.clientConfig?.ingest)}
						/>
					</Stack>
				</Grid>
			) : null}
			{secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("library.service.environments.api")}
						</Typography>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["base-url"]}
							title={secondHostLms?.clientConfig?.["base-url"]}
							type="url"
						/>
					</Stack>
				</Grid>
			) : null}
			{secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.context_hierarchy")}
						</Typography>
						<FormatArrayAsList
							roles={secondHostLms?.clientConfig?.contextHierarchy}
						/>
					</Stack>
				</Grid>
			) : null}

			{/* 'API Key' has many different guises on clientConfig: for FOLIO libraries it's simple*/}
			{secondHostLms?.clientConfig?.apikey ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<PrivateData
						clientConfigType={t("library.service.environments.api_key")}
						hiddenTextValue={secondHostLms?.clientConfig?.apikey}
						id="lib-prod-env-api-key-2"
					/>
				</Grid>
			) : null}

			{/* For Polaris libraries it's the 'access key' attribute*/}
			{secondHostLms?.clientConfig?.["access-key"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<PrivateData
						clientConfigType={t("library.service.environments.api_key")}
						hiddenTextValue={secondHostLms?.clientConfig?.["access-key"]}
						id="lib-prod-env-api-key-2"
					/>
				</Grid>
			) : null}

			{/* And for Sierra libraries it is the 'key' attribute*/}
			{secondHostLms?.clientConfig?.key ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<PrivateData
						clientConfigType={t("library.service.environments.api_key")}
						hiddenTextValue={secondHostLms?.clientConfig?.key}
						id="lib-prod-env-api-key-2"
					/>
				</Grid>
			) : null}
			{secondHostLms?.clientConfig?.secret ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<PrivateData
						clientConfigType={t("library.service.environments.api_secret")}
						hiddenTextValue={secondHostLms?.clientConfig?.secret}
						id="lib-test-env-api-secret"
					/>
				</Grid>
			) : null}

			{/* Polaris specific values - Second Host LMS */}

			{secondHostLms?.clientConfig?.["domain-id"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("library.service.environments.polaris_domain")}
						</Typography>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["domain-id"]}
						/>
					</Stack>
				</Grid>
			) : null}
			{secondHostLms?.clientConfig?.["staff-username"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("library.service.environments.polaris_username")}
						</Typography>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["staff-username"]}
						/>
					</Stack>
				</Grid>
			) : null}
			{secondHostLms?.clientConfig?.["staff-password"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<PrivateData
						clientConfigType={t(
							"library.service.environments.polaris_password"
						)}
						hiddenTextValue={secondHostLms?.clientConfig?.["staff-password"]}
						id="lib-test-env-polaris-password"
					/>
				</Grid>
			) : null}
			{secondHostLms?.clientConfig?.services?.["organisation-id"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("library.service.environments.polaris_org_id")}
						</Typography>
						<RenderAttribute
							attribute={
								secondHostLms?.clientConfig?.services?.["organisation-id"]
							}
						/>
					</Stack>
				</Grid>
			) : null}
			{/* FOLIO Specific values (Second Host LMS): folio-tenant, metadata-prefix, record_syntax, user-base-url*/}

			{secondHostLms?.clientConfig?.["folio-tenant"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.folio_tenant")}
						</Typography>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["folio-tenant"]}
						/>
					</Stack>
				</Grid>
			) : null}

			{secondHostLms?.clientConfig?.["metadata-prefix"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.metadata")}
						</Typography>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["metadata-prefix"]}
						/>
					</Stack>
				</Grid>
			) : null}

			{secondHostLms?.clientConfig?.["record-syntax"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.record_syntax")}
						</Typography>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["record-syntax"]}
						/>
					</Stack>
				</Grid>
			) : null}

			{secondHostLms?.clientConfig?.["user-base-url"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.user_base_url")}
						</Typography>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["user-base-url"]}
							title={secondHostLms?.clientConfig?.["user-base-url"]}
							type="url"
						/>
					</Stack>
				</Grid>
			) : null}
			{/* Sierra specific values*/}

			{secondHostLms?.clientConfig?.holdPolicy ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.hold_policy")}
						</Typography>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.holdPolicy}
						/>
					</Stack>
				</Grid>
			) : null}

			{secondHostLms?.clientConfig?.["page-size"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("hostlms.client_config.page_size")}
						</Typography>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["page-size"]}
						/>
					</Stack>
				</Grid>
			) : null}
		</Grid>
	);
}
