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
import {useState} from "react";

interface SimpleTextQuerySpecProps {
  searchTerm: string;
  handleSearch: (q: string, qtype: string) => void;
  queryType: string;
}



export function SimpleTextQuerySpec({ searchTerm, handleSearch, queryType }: SimpleTextQuerySpecProps ) {

  const [input, setInput] = useState(searchTerm)

  const clearTerm = () => {
  }

  // We only search on enter now
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch(input.trim(),queryType)
    }
  }

  return (
      <TextField
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search"
        InputProps={{
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
                aria-label="clear search">
                <Clear />
              </IconButton>
            </InputAdornment>
          ),
        }}
        fullWidth
        variant="outlined"
        size="small"
        sx={{ mb: 2 }}
      />
  );
}

