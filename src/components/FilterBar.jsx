import { Stack } from '@mui/material';

/**
 * A quiet white toolbar for table filters — keeps search, status and date
 * controls visually grouped above the grid instead of floating loose on
 * the page background.
 */
export default function FilterBar({ children, direction = 'row', sx }) {
  return (
    <Stack
      direction={direction}
      spacing={1.5}
      alignItems="center"
      sx={{
        mb: 2,
        flexWrap: 'wrap',
        rowGap: 1,
        p: 1.5,
        bgcolor: 'background.paper',
        border: '1px solid rgba(15,23,42,.08)',
        borderRadius: '12px',
        ...sx,
      }}
    >
      {children}
    </Stack>
  );
}
