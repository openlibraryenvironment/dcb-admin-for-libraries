import Box from "@mui/material/Box";
import { visuallyHidden } from "@mui/utils";

interface ChartDataTableProps {
	/** Names the table, and should be the chart's own heading. */
	caption: string;
	columns: string[];
	rows: (string | number)[][];
}

/**
 * The numbers behind a chart, as a table, for anyone who cannot read the chart.
 *
 * Hidden rather than a toggle: the chart already serves everyone who can see
 * it, and a second visible copy of nineteen panels would bury the page.
 */
export default function ChartDataTable({
	caption,
	columns,
	rows,
}: ChartDataTableProps) {
	if (rows.length === 0) return null;

	return (
		<Box sx={visuallyHidden}>
			<table>
				<caption>{caption}</caption>
				<thead>
					<tr>
						{columns.map((column) => (
							<th key={column} scope="col">
								{column}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={String(row[0])}>
							<th scope="row">{row[0]}</th>
							{row.slice(1).map((cell, index) => (
								<td key={columns[index + 1]}>{cell}</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</Box>
	);
}
