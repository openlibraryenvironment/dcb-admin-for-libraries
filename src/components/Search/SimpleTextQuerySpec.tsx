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

export function SimpleTextQuerySpec({ searchTerm, handleSearch }) {
  return (
      <TextField
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
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
                onClick={handleClear}
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

