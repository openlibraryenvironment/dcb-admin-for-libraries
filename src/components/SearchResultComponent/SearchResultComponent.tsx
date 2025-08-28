import { CustomLink } from "@components/CustomLink";
import { useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { GridRenderCellParams } from "@mui/x-data-grid-premium";

interface SearchResultProps {
	params: GridRenderCellParams;
	indexCode: string;
}
// Key information for this component to display - note that description might change
// Title, Author, Format, Description, ISBN (or other identifier)
// Bonus info
// Language, No. of available items, Publisher, Top Subjects, Publication Date etc ..
// Note that a lot of the above belongs more on the individual record page. Which also needs a re-work and componentisation

// Potential actions
// One-click request button IF we can check live availability sensibly (to grey it out if no items are available)
export const SearchResult = ({ params, indexCode }: SearchResultProps) => {
	return (
		// <Box width="100%" mb={2} p={0} m={0}>
		<Card
			variant="outlined"
			elevation={4}
			sx={{
				backgroundColor: "var(--mui-palette-primary-searchResultBackground)",
			}}>
			{/** Gives us the drop shadow and the background colour */}
			<CardContent>
				<Typography variant="h6">
					<CustomLink
						to="/indexes/$indexCode/$recordId"
						params={{ indexCode: indexCode, recordId: params.row.id }}>
						{params.row.title}
					</CustomLink>
				</Typography>
				<Typography variant="body2">{params.row.description}</Typography>
				<Typography variant="body2" color="text.secondary" mb={2}>
					{params.row.sourceTypes?.join(",")} &nbsp;
					{params.row.publication
						?.map(
							(pub: { publisher: string; dateOfPublication: string }) =>
								pub.publisher + " " + pub.dateOfPublication
						)
						.join(", ")}
				</Typography>
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
					{params.row.subjects?.map((sub: { value: string }, index: bigint) => (
						<Chip
							key={params.row.id + "." + index + "." + sub.value}
							label={sub.value}
						/>
					))}
				</Stack>
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
					{params.row.isbns?.map((isbn: string, index: bigint) => (
						<Chip
							key={params.row.id + "." + index + "." + isbn}
							label={`isbn ${isbn}`}
						/>
					))}
					{params.row.issns?.map((issn: string, index: bigint) => (
						<Chip
							key={params.row.id + "." + index + "." + issn}
							label={`issn ${issn}`}
						/>
					))}
				</Stack>
			</CardContent>
		</Card>
		// </Box>
	);
};
