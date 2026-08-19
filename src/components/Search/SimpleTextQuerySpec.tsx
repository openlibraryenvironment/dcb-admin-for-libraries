import { TextField, InputAdornment, IconButton } from "@mui/material";
import Search from "@mui/icons-material/Search";
import Clear from "@mui/icons-material/Clear";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface SimpleTextQuerySpecProps {
	searchTerm: string;
	handleSearch: (q: string, qtype: string) => void;
	queryType: string;
}

export function SimpleTextQuerySpec({
	searchTerm,
	handleSearch,
	queryType,
}: SimpleTextQuerySpecProps) {
	const { t } = useTranslation();
	const [input, setInput] = useState(searchTerm);

	const clearTerm = () => {
		setInput("");
		handleSearch("", queryType);
	};

	// We only search on enter now
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleSearch(input.trim(), queryType);
		}
	};

	return (
		<TextField
			value={input}
			onChange={(e) => setInput(e.target.value)}
			onKeyDown={handleKeyDown}
			placeholder={t("ui.actions.search")}
			slotProps={{
				input: {
					startAdornment: (
						<InputAdornment position="start">
							<Search />
						</InputAdornment>
					),
					endAdornment: searchTerm && (
						<InputAdornment position="end">
							<IconButton
								onClick={clearTerm}
								edge="end"
								aria-label={t("ui.actions.clear_search")}>
								<Clear />
							</IconButton>
						</InputAdornment>
					),
				},
			}}
			fullWidth
			variant="outlined"
			size="small"
			sx={{ mb: 2 }}
		/>
	);
}
