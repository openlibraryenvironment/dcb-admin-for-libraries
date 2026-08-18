import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import axios from "axios";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
	BRAND_IMAGE_ACCEPT,
	BRAND_IMAGE_MAX_BYTES,
} from "@constants/discoveryBranding";

interface Props {
	/** The stored value. Whichever control produced it, it is one column. */
	value: string;
	onChange: (value: string) => void;
	label: string;
	helperText: string;
	error?: boolean;
	disabled?: boolean;
}

/** The one field of the router context this component needs. */
interface ApiConfig {
	VITE_DCB_API_BASE: string;
}

/** dcb-service's error body. The message is written for a person; show it. */
interface UploadFailure {
	response?: { data?: { message?: string } };
}

/**
 * The library's logo, two ways to supply it — R-17e.
 *
 * <h2>Neither control is the fallback for the other</h2>
 *
 * A library with a marketing team and a web server must not be made to re-upload into
 * our bucket. A library with neither must not be told to go and find hosting before it
 * can have a logo. Both write to the same field, because the column stores a URL either
 * way.
 *
 * Upload is offered first, and the form says why rather than leaving it implied: an
 * external address means every patron's browser fetches the image from a host we do not
 * control, so their outage unbrands us and their logs get the patron's IP and our
 * referrer.
 *
 * <h2>The library half is the logo alone</h2>
 *
 * No header icon and no background here, deliberately. A mark identifies an organisation
 * and belongs at every level of the brand chain; a canvas does not. A per-library
 * background would repaint the discovery app's whole page every time a patron changed
 * scope, which is motion rather than identity — so the canvas is consortium chrome and
 * is set in DCB Admin, not here.
 *
 * <h2>The accepted formats are stated BEFORE the file picker</h2>
 *
 * PNG or JPEG. SVG is refused because it is a script-capable document and one served
 * from our origin would be stored XSS in the chrome of every patron page; WebP is
 * refused because it cannot be re-encoded server-side, and an image we cannot decode is
 * one we will not store.
 *
 * The size check here is a courtesy, not a control. dcb-service sniffs magic bytes, caps
 * dimensions from the image header before any decode, and re-encodes what it stores.
 * Nothing a browser reports is evidence about the bytes.
 */
export function BrandImageField({
	value,
	onChange,
	label,
	helperText,
	error,
	disabled,
}: Props) {
	const { t } = useTranslation();
	const auth = useAuth();
	const { cfg } = useRouter().options.context as { cfg: ApiConfig };
	const fileInput = useRef<HTMLInputElement>(null);

	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);

	const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		// Reset immediately, so choosing the same file again after a failure still fires
		// a change event.
		event.target.value = "";
		if (!file) {
			return;
		}

		if (file.size > BRAND_IMAGE_MAX_BYTES) {
			setUploadError(t("library.brand.upload_too_large"));
			return;
		}

		setUploading(true);
		setUploadError(null);

		const form = new FormData();
		form.append("file", file);

		try {
			const { data } = await axios.post(
				`${cfg.VITE_DCB_API_BASE}/brand-assets`,
				form,
				{
					headers: {
						Authorization: `Bearer ${auth.user?.access_token}`,
					},
				}
			);
			onChange(data.url);
		} catch (uploadFailure) {
			// dcb-service's refusals are written for a person — "the file is not a PNG or
			// a JPEG", "the image is 6000x4000; the limit is 4096 pixels on either edge".
			// Showing a status code instead would undo the point of validating on the
			// server at all.
			setUploadError(
				(uploadFailure as UploadFailure)?.response?.data?.message ??
					t("library.brand.upload_failed")
			);
		} finally {
			setUploading(false);
		}
	};

	return (
		<Stack direction="column" spacing={1}>
			<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
				<Button
					variant="outlined"
					size="small"
					disabled={disabled || uploading}
					onClick={() => fileInput.current?.click()}
					startIcon={
						uploading ? <CircularProgress size={16} thickness={5} /> : undefined
					}
				>
					{uploading ? t("library.brand.uploading") : t("library.brand.upload")}
				</Button>
				<Typography variant="body2" color="text.secondary">
					{t("library.brand.upload_formats")}
				</Typography>
			</Stack>

			{/* Visually hidden rather than display:none — a hidden input is still the
			    labelled control the button proxies for, and display:none takes it out of
			    the accessibility tree entirely. */}
			<Box
				component="input"
				ref={fileInput}
				type="file"
				accept={BRAND_IMAGE_ACCEPT}
				onChange={handleFile}
				aria-label={label}
				sx={{
					position: "absolute",
					width: 1,
					height: 1,
					overflow: "hidden",
					clip: "rect(0 0 0 0)",
					whiteSpace: "nowrap",
				}}
			/>

			{uploadError && (
				<Alert severity="error" onClose={() => setUploadError(null)}>
					{uploadError}
				</Alert>
			)}

			<TextField
				value={value}
				onChange={(event) => onChange(event.target.value)}
				fullWidth
				size="small"
				disabled={disabled}
				error={error}
				label={t("library.brand.image_url")}
				helperText={helperText}
			/>
		</Stack>
	);
}
