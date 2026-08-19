import { Box, Button, Stack, Typography, useTheme } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import ErrorOutlined from "@mui/icons-material/ErrorOutlined";

interface ErrorProps {
	title: string;
	message: string;
	description?: string;
	action: string;
	goBack?: string;
	reload?: boolean;
}
export default function Error({
	title,
	message,
	description,
	action,
	goBack,
	reload,
}: ErrorProps) {
	const actionLink = goBack ? goBack : "/";
	const navigate = useNavigate();
	const theme = useTheme();

	const handleReturn = () => {
		navigate({ to: actionLink });
	};
	const handleReload = () => {
		location.reload();
	};
	return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                flex: "1",
                minHeight: "0"
            }}>
            <Stack
                direction="column"
                spacing={2}
                sx={{
                    alignItems: "center",
                    alignSelf: "center"
                }}>
				<ErrorOutlined
					sx={{ fontSize: 200 }}
					htmlColor={(theme.vars || theme).palette.primary.exclamationIcon}
				/>
				<Typography variant="h1">{title}</Typography>
				<Typography variant="componentSubheading" sx={{ fontWeight: "bold" }}>
					{message}
				</Typography>
				<Typography variant="attributeText">{description}</Typography>
				<Button
					variant="contained"
					onClick={reload ? handleReload : handleReturn}
					size="large">
					{action}
				</Button>
			</Stack>
        </Box>
    );
}
