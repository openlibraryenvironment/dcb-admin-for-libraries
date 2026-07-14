import {
	Outlet,
	createFileRoute,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { useAuth, withAuthenticationRequired } from "react-oidc-context";
import { Layout } from "@components/Layout/Layout";
import Loading from "@components/Loading/Loading";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { storageKey } from "@helpers/appBase";

const AuthenticatedLayout = () => {
	// This component provides the main app layout (e.g., header, sidebar)
	// for all authenticated pages.
	const auth = useAuth();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		// If no user, not applicable
		if (!auth.user) {
			return;
		}

		const roles = auth.user.profile?.roles || [];
		const isReadOnly = roles.includes("LIBRARY_READ_ONLY");

		// If user is not read only, not applicable
		if (!isReadOnly) {
			return;
		}
		console.log(location.pathname);
		// If user is read only and trying to access something they shouldn't,  do not allow.
		const isTryingToAccessAllowedPage =
			location.pathname.includes("/requesting/") ||
			location.pathname.includes("logout");

		if (!isTryingToAccessAllowedPage) {
			navigate({
				to: "/requesting",
				replace: true,
			});
		}
	}, [auth.user, location.pathname, navigate]);

	if (auth.isLoading) {
		return (
			<Loading title={t("login.authenticating")} subtitle={t("ui.info.wait")} />
		);
	}
	return (
		<Layout>
			<Outlet />
		</Layout>
	);
};
// role prohibition here
export const Route = createFileRoute("/__authenticated")({
	// beforeLoad: ({ context, location }) => {
	// 	// We should be able to get the auth from router context
	// 	// And then sub in roles
	// 	// Then we can check for READ_ONLY
	// 	const user = context?.auth?.user;
	// 	console.log(context);
	// 	console.log(user);
	// 	const roles = user?.profile?.roles;
	// 	console.log(context?.auth?.user);
	// 	console.log(roles);
	// 	const isReadOnly = roles?.includes("LIBRARY_READ_ONLY");

	// 	// We need to work out the path the user is trying to access here.
	// 	const isTryingToAccessAllowedPage =
	// 		location.pathname.startsWith("/indexes/");

	// 	// If the user is read-only AND is trying to go anywhere that is not requesting, redirect
	// 	if (isReadOnly && !isTryingToAccessAllowedPage) {
	// 		throw redirect({
	// 			to: "/indexes/mobius",
	// 			replace: true,
	// 		});
	// 	}
	// },
	component: withAuthenticationRequired(AuthenticatedLayout, {
		onBeforeSignin: () => {
			// Namespaced: sibling apps share one sessionStorage on this origin.
			// The value stays browser-absolute (it includes the base), because it is
			// handed straight to window.location.replace() after the callback.
			sessionStorage.setItem(
				storageKey("afterLoginRedirectPath"),
				window.location.pathname + window.location.search + window.location.hash
			);
		},
	}),
});
