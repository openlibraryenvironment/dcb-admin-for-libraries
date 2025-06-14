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

interface LuceneQueryBuilderProps {
  searchTerm: string;
  handleSearch: (q: string, qtype: string) => void;
}

export function LuceneQueryBuilder({ searchTerm, handleSearch } : LuceneQueryBuilderProps ) {

  const [query, setQuery] = useState({ combinator: 'and', rules: [
    { field: 'any', operator: 'contains', value: '' }
  ] });

  const muiTheme = createTheme();

  const visitBoolean = (query:any) => {
    return query.rules.map(toLucene).join(query.combinator);
  }

  const visitTerm = (query:any) => {
    switch ( query.field ) {
      case 'any':
        return query.value;
        break;
      case 'title':
        return "metadata.title: "+query.value;
        break;
    }
  }

	// The query is a map the root of the map can be a term of a group (Boolean)
  // Boolean nodes have the key combinator and a rules key that contains child clauses
  // Term nodes have the key field
	const toLucene = (query:any) => {
    if ( query.combinator != null )
      return visitBoolean(query);
    else
      return visitTerm(query);
  }

  const fields=[
    { name: 'any', label: 'Any', inputType:'text' },
    { name: 'title', label: 'Title', inputType:'text' }
  ]

  const handleBuilderChange = (newQuery: any) => {
    setQuery(newQuery);
    const luceneQuery = toLucene(newQuery);
    handleSearch(luceneQuery, 'lucene');
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

