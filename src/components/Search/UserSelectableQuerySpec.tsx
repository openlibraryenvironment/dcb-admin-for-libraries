import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Typography,
  Card,
} from "@mui/material";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { SimpleTextQuerySpec } from "./SimpleTextQuerySpec";
import { LuceneQueryBuilder } from "./LuceneQueryBuilder";
import * as React from "react";

export function UserSelectableQuerySpec({ searchTerm, handleSearch }) {

  const [tab, setTab] = React.useState(0);

  return (
   <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 2, mb: 2 }}>
     <Box sx={{ mb: 1 }}>
      {tab === 0 && (
        <SimpleTextQuerySpec value={searchTerm} handleSearch={handleSearch} type="default" />
      )}
      {tab === 1 && (
        <LuceneQueryBuilder value={searchTerm} handleSearch={handleSearch} />
      )}
      {tab === 2 && (
        <SimpleTextQuerySpec value={searchTerm} handleSearch={handleSearch} type="Lucene" />
      )}
      {tab === 3 && (
        <SimpleTextQuerySpec value={searchTerm} handleSearch={handleSearch} type="CQL" />
      )}
     </Box>
     <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
       <Tabs 
         value={tab} 
         onChange={(_, newTab) => setTab(newTab)}
         aria-label="Query input type"
         size="small"
         TabIndicatorProps={{
           sx: {
             top: 'unset',
             bottom: 'unset', // unset the default bottom position
           },
         }}
         sx={{
           minHeight: '28px',
           '& .MuiTab-root': {
             minHeight: '28px',
             minWidth: '64px',
             padding: '4px 8px',
             fontSize: '0.65rem',
           },
         }}
         >
         <Tab label="Simple" />
         <Tab label="Lucene Builder" />
         <Tab label="Lucene Text" />
         <Tab label="CQL" />
       </Tabs>
     </Box>
   </Box>
  );
}

