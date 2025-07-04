import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";

const OKAPI_URL = "/api"; // Using the proxy

interface ILLAuthContextType {
	isILLAuthenticated: boolean;
	loginILL: (credentials: {
		username: string;
		password: string;
	}) => Promise<void>;
	logoutILL: () => void;
	isLoading: boolean; // Add a loading state for the initial session check
}

const ILLAuthContext = createContext<ILLAuthContextType | null>(null);

/**
 * A placeholder function to check if the session is valid.
 * Needs the actual session check endpoint from ILL
 * If it even exists
 * Hope it does or this is going to be tricky
 */
// const checkILLSession = async (): Promise<boolean> => {
// 	try {
// 		// NOTE: Replace '/authn/check-session' with a real endpoint. Haven't been able to find one just yet
// 		const response = await fetch(`${OKAPI_URL}/authn/check-session`, {
// 			method: "POST", // Or GET, depending on the endpoint
// 			headers: { "Content-Type": "application/json", "X-Okapi-Tenant": "ill" },
// 			body: JSON.stringify({}), // Body may or may not be needed
// 			credentials: "include", // IMPORTANT: This sends the HttpOnly cookie
// 		});
// 		return response.ok;
// 	} catch (error) {
// 		console.error("Session check failed", error);
// 		return false;
// 	}
// };

const checkILLSession = async (): Promise<boolean> => {
	console.log("Skipping session check for debugging.");
	return Promise.resolve(false); // Assume not logged in without a network call
};

export function ILLAuthProvider({ children }: { children: React.ReactNode }) {
	const [isILLAuthenticated, setIsILLAuthenticated] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true); // Start in loading state
	const navigate = useNavigate();
	const { cfg } = useRouter().options.context as { cfg: any };

	// On initial load, check if the session is still valid
	useEffect(() => {
		checkILLSession().then((isAuthenticated) => {
			setIsILLAuthenticated(isAuthenticated);
			setIsLoading(false); // Finished loading
		});
	}, []);

	const loginILL = async (credentials: {
		username: string;
		password: string;
	}) => {
		// The login request itself doesn't change much
		// const response = await fetch(
		// 	`${OKAPI_URL}/bl-users/login-with-expiry?expandPermissions=true&fullPermissions=true`,
		// temp not using proxy
		const response = await fetch(
			`${cfg.VITE_ILL_API_BASE}/bl-users/login-with-expiry?expandPermissions=true&fullPermissions=true`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Okapi-Tenant": "ill",
				},
				body: JSON.stringify(credentials),
			}
		);

		if (!response.ok) {
			throw new Error("ILL Login failed. Please check your credentials.");
		}

		// On success, we don't need to read a token. We just update our app's state.
		// The browser has already stored the HttpOnly cookie automatically.
		setIsILLAuthenticated(true);
	};

	const logoutILL = () => {
		// We can't delete the cookie, but we can clear our app state and navigate
		setIsILLAuthenticated(false);
		navigate({ to: "/ill/login" });
	};

	return (
		<ILLAuthContext.Provider
			value={{ isILLAuthenticated, loginILL, logoutILL, isLoading }}>
			{children}
		</ILLAuthContext.Provider>
	);
}

// ... useILLAuth hook remains the same
export function useILLAuth() {
	const context = useContext(ILLAuthContext);
	if (!context) {
		throw new Error("useILLAuth must be used within an ILLAuthProvider");
	}
	return context;
}
