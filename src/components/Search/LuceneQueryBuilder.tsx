import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Typography,
  Card,
} from "@mui/material";
import Search from "@mui/icons-material/Search";
import Clear from "@mui/icons-material/Clear";
import QueryBuilder from 'react-querybuilder';
import { useState } from 'react';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import { QueryBuilderMaterial } from '@react-querybuilder/material';

export function LuceneQueryBuilder({ searchTerm, handleSearch }) {

  const [query, setQuery] = useState({ combinator: 'and', rules: [
    {
      field: 'title',
      operator: 'contains',
      value: ''
    }
  ] });

  const muiTheme = createTheme();

	const toLucene = (query) => {
    console.log("toLucene %o",query);
    return "science";
  }

  const fields=[
    { name: 'title', label: 'Title', inputType:'text' }
  ]

  const handleBuilderChange = (newQuery) => {
    setQuery(newQuery);
    const luceneQuery = toLucene(newQuery);
    handleSearch(luceneQuery);
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

