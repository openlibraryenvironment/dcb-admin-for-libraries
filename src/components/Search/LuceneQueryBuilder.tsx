import QueryBuilder from "react-querybuilder";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { QueryBuilderMaterial } from "@react-querybuilder/material";

interface LuceneQueryBuilderProps {
	searchTerm: string;
	handleSearch: (q: string, qtype: string) => void;
}

export function LuceneQueryBuilder({
	searchTerm,
	handleSearch,
}: LuceneQueryBuilderProps) {
	const { t } = useTranslation();
	const [query, setQuery] = useState({
		combinator: "AND",
		rules: [{ field: "any", operator: "contains", value: searchTerm }],
	});

	const muiTheme = createTheme();

	const visitBoolean = (query: any) => {
		return query.rules.map(toLucene).join(query.combinator);
	};

	const visitTerm = (query: any) => {
		switch (query.field) {
			case "any":
				return query.value;
				break;
			case "title":
				return "metadata.title: " + query.value;
				break;
		}
	};

	// The query is a map the root of the map can be a term of a group (Boolean)
	// Boolean nodes have the key combinator and a rules key that contains child clauses
	// Term nodes have the key field
	const toLucene = (query: any) => {
		if (query.combinator != null) return visitBoolean(query);
		else return visitTerm(query);
	};

	// The trailing entry was listed twice, which put two identical options in
	// the field picker.
	const fields = useMemo(
		() => [
			{ name: "any", label: t("requesting.shared_index.search_fields.any"), inputType: "text" },
			{
				name: "title",
				label: t("requesting.shared_index.search_fields.title"),
				inputType: "text",
			},
			{
				name: "metadata.subjects.label.keyword",
				label: t("requesting.shared_index.search_fields.subject"),
				inputType: "text",
			},
			{
				name: "publisher.keyword",
				label: t("requesting.shared_index.search_fields.publisher"),
				inputType: "text",
			},
			{
				name: "metadata.agents.label.keyword",
				label: t("requesting.shared_index.search_fields.contributor"),
				inputType: "text",
			},
		],
		[t],
	);

	const handleBuilderChange = (newQuery: any) => {
		setQuery(newQuery);
		const luceneQuery = toLucene(newQuery);
		handleSearch(luceneQuery, "lucene");
	};

	return (
		<ThemeProvider theme={muiTheme}>
			<QueryBuilderMaterial>
				<QueryBuilder
					fields={fields}
					query={query}
					onQueryChange={handleBuilderChange}
				/>
			</QueryBuilderMaterial>
		</ThemeProvider>
	);
}
