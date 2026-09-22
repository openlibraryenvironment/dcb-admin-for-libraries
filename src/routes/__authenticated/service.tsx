import { Attribute } from "@components/Attribute/Attribute";
import { pageTitle } from "@helpers/pageTitle";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import Grid from "@mui/material/Grid";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";
import { useQuery } from "@tanstack/react-query";
import request from "graphql-request";
import { getLibrary } from "@queries/getLibrary";
import { Library } from "@models/Library";
import { HostLMS } from "@models/HostLMS";
import { getILS } from "@helpers/getILS";
import Typography from "@mui/material/Typography";
import RenderAttribute from "@components/RenderAttribute/RenderAttribute";
import { Divider } from "@mui/material";
import FormatArrayAsList from "@components/FormatArrayAsList/FormatArrayAsList";
import PrivateData from "@components/PrivateData/PrivateData";
import { useMemo } from "react";

export const Route = createFileRoute("/__authenticated/service")({
	head: () => ({ meta: [{ title: pageTitle("nav.library.service") }] }),
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
	const { agencyCode: code } = useAgencyCodes();

	// does this need a different key
	const { data } = useQuery({
		queryKey: ["libraryInfo", headers, code, cfg.VITE_DCB_API_BASE],
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getLibrary(),
				{
					query: "agencyCode:" + code,
					pagesize: 10,
					pageno: 0,
					orderBy: "fullName",
					order: "DESC",
				},
				headers
			),
		// do the on success here
	});
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
				<Typography variant="h1">{t("nav.library.service")}</Typography>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("library.service.systems.ils")}>
					<RenderAttribute attribute={ils} />
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("library.service.systems.discovery")}>
					<RenderAttribute attribute={library?.discoverySystem} />
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("library.service.systems.patron_site")}>
					{library?.patronWebsite ? (
						<RenderAttribute
							attribute={library?.patronWebsite}
							title={t("common.patron_website")}
						/>
					) : (
						<Typography variant="attributeText">-</Typography>
					)}
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Typography variant="h3" sx={{
                    fontWeight: "bold"
                }}>
					{t("library.config.patronAuth.title")}
				</Typography>
				<Attribute label={t("library.config.patronAuth.auth_profile")}>
					<RenderAttribute attribute={library?.agency?.authProfile} />
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("hostlms.configuration")}>
					<RenderAttribute attribute={library?.hostLmsConfiguration} />
				</Attribute>
			</Grid>
            {firstHostLms ? (
				<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
					<Divider aria-hidden="true"></Divider>
				</Grid>
			) : null}
            {firstHostLms ? (
				<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
					<Typography variant="h3" sx={{
                        fontWeight: "bold"
                    }}>
						{t("library.service.hostlms_title", {
							name: firstHostLms?.name,
						})}
					</Typography>
				</Grid>
			) : null}
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("hostlms.name")}>
					<RenderAttribute attribute={firstHostLms?.name} />
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("hostlms.code")}>
					<RenderAttribute attribute={firstHostLms?.code} />
				</Attribute>
			</Grid>
            {/* Handle multi-roles and separate them */}
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("hostlms.roles")}>
					{<FormatArrayAsList roles={firstHostLms?.clientConfig?.["roles"]} />}
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("hostlms.id")}>
					<RenderAttribute attribute={firstHostLms?.id} />
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("hostlms.client_config.ingest")}>
					<RenderAttribute
						attribute={String(firstHostLms?.clientConfig?.ingest)}
					/>
				</Attribute>
			</Grid>
            {/* Suppression rulesets */}
            {firstHostLms?.suppressionRulesetName != null && (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.bibSuppressionRulesetName")}>
						<Typography variant="attributeText">
							<RenderAttribute
								attribute={firstHostLms?.suppressionRulesetName}
							/>
						</Typography>
					</Attribute>
				</Grid>
			)}
            {firstHostLms?.itemSuppressionRulesetName != null && (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.itemSuppressionRulesetName")}>
						<Typography variant="attributeText">
							<RenderAttribute
								attribute={firstHostLms?.itemSuppressionRulesetName}
							/>
						</Typography>
					</Attribute>
				</Grid>
			)}
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("library.service.environments.api")}>
					<RenderAttribute
						attribute={firstHostLms?.clientConfig?.["base-url"]}
						title={firstHostLms?.clientConfig?.["base-url"]}
					/>
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("hostlms.client_config.context_hierarchy")}>
					<FormatArrayAsList
						roles={firstHostLms?.clientConfig?.contextHierarchy}
					/>
				</Attribute>
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
					<Attribute label={t("hostlms.client_config.default_agency")}>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.defaultAgency}
						/>
					</Attribute>
				</Grid>
			) : null}
            {/* Sierra specific values*/}
            {firstHostLms?.clientConfig?.holdPolicy ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.hold_policy")}>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.holdPolicy}
						/>
					</Attribute>
				</Grid>
			) : null}
            {firstHostLms?.clientConfig?.["page-size"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.page_size")}>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["page-size"]}
						/>
					</Attribute>
				</Grid>
			) : null}
            {/* Polaris-specific values*/}
            {firstHostLms?.clientConfig?.["domain-id"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("library.service.environments.polaris_domain")}>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["domain-id"]}
						/>
					</Attribute>
				</Grid>
			) : null}
            {firstHostLms?.clientConfig?.["domain-id"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("library.service.environments.polaris_username")}>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["staff-username"]}
						/>
					</Attribute>
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
					<Attribute label={t("library.service.environments.polaris_org_id")}>
						<RenderAttribute
							attribute={
								firstHostLms?.clientConfig?.services?.["organisation-id"]
							}
						/>
					</Attribute>
				</Grid>
			) : null}
            {/* FOLIO Specific values: folio-tenant, metadata-prefix, record_syntax, user-base-url*/}
            {firstHostLms?.clientConfig?.["folio-tenant"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.folio_tenant")}>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["folio-tenant"]}
						/>
					</Attribute>
				</Grid>
			) : null}
            {firstHostLms?.clientConfig?.["metadata-prefix"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.metadata")}>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["metadata-prefix"]}
						/>
					</Attribute>
				</Grid>
			) : null}
            {firstHostLms?.clientConfig?.["record-syntax"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.record_syntax")}>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["record-syntax"]}
						/>
					</Attribute>
				</Grid>
			) : null}
            {firstHostLms?.clientConfig?.["user-base-url"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.user_base_url")}>
						<RenderAttribute
							attribute={firstHostLms?.clientConfig?.["user-base-url"]}
							title={firstHostLms?.clientConfig?.["user-base-url"]}
						/>
					</Attribute>
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
					<Typography variant="h3" sx={{
                        fontWeight: "bold"
                    }}>
						{t("library.service.hostlms_title", {
							name: secondHostLms?.name,
						})}
					</Typography>
				</Grid>
			) : null}
            {secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.name")}>
						<RenderAttribute attribute={secondHostLms?.name} />
					</Attribute>
				</Grid>
			) : null}
            {secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.code")}>
						<RenderAttribute attribute={secondHostLms?.code} />
					</Attribute>
				</Grid>
			) : null}
            {secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.roles")}>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["roles"]}
						/>
					</Attribute>
				</Grid>
			) : null}
            {secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.id")}>
						<RenderAttribute attribute={secondHostLms?.id} />
					</Attribute>
				</Grid>
			) : null}
            {secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.ingest")}>
						<RenderAttribute
							attribute={String(secondHostLms?.clientConfig?.ingest)}
						/>
					</Attribute>
				</Grid>
			) : null}
            {secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("library.service.environments.api")}>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["base-url"]}
							title={secondHostLms?.clientConfig?.["base-url"]}
						/>
					</Attribute>
				</Grid>
			) : null}
            {secondHostLms ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.context_hierarchy")}>
						<FormatArrayAsList
							roles={secondHostLms?.clientConfig?.contextHierarchy}
						/>
					</Attribute>
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
					<Attribute label={t("library.service.environments.polaris_domain")}>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["domain-id"]}
						/>
					</Attribute>
				</Grid>
			) : null}
            {secondHostLms?.clientConfig?.["staff-username"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("library.service.environments.polaris_username")}>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["staff-username"]}
						/>
					</Attribute>
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
					<Attribute label={t("library.service.environments.polaris_org_id")}>
						<RenderAttribute
							attribute={
								secondHostLms?.clientConfig?.services?.["organisation-id"]
							}
						/>
					</Attribute>
				</Grid>
			) : null}
            {/* FOLIO Specific values (Second Host LMS): folio-tenant, metadata-prefix, record_syntax, user-base-url*/}
            {secondHostLms?.clientConfig?.["folio-tenant"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.folio_tenant")}>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["folio-tenant"]}
						/>
					</Attribute>
				</Grid>
			) : null}
            {secondHostLms?.clientConfig?.["metadata-prefix"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.metadata")}>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["metadata-prefix"]}
						/>
					</Attribute>
				</Grid>
			) : null}
            {secondHostLms?.clientConfig?.["record-syntax"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.record_syntax")}>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["record-syntax"]}
						/>
					</Attribute>
				</Grid>
			) : null}
            {secondHostLms?.clientConfig?.["user-base-url"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.user_base_url")}>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["user-base-url"]}
							title={secondHostLms?.clientConfig?.["user-base-url"]}
						/>
					</Attribute>
				</Grid>
			) : null}
            {/* Sierra specific values*/}
            {secondHostLms?.clientConfig?.holdPolicy ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.hold_policy")}>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.holdPolicy}
						/>
					</Attribute>
				</Grid>
			) : null}
            {secondHostLms?.clientConfig?.["page-size"] ? (
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Attribute label={t("hostlms.client_config.page_size")}>
						<RenderAttribute
							attribute={secondHostLms?.clientConfig?.["page-size"]}
						/>
					</Attribute>
				</Grid>
			) : null}
        </Grid>
    );
}
