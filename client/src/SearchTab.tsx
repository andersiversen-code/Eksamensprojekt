import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Grid, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { api, type Festival, type SearchResult } from './api';
import { formatDates, type Home } from './utils';
import FestivalCard from './FestivalCard';

interface Props {
  festivals: Festival[];
  home: Home;
  onOpen: (id: string) => void;
}

const EXAMPLES = ['Mercyful Fate', 'Carcass', 'black metal', 'doom', 'Wacken'];

export default function SearchTab({ festivals, home, onOpen }: Props) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResult(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      api
        .search(q)
        .then((r) => {
          setResult(r);
          setError(null);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const byId = new Map(festivals.map((f) => [f.id, f]));

  return (
    <Stack spacing={3}>
      <TextField
        fullWidth
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        label="Search a festival, band or genre"
        placeholder="e.g. Wacken, Mercyful Fate, black metal"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                {loading ? <CircularProgress size={20} /> : <SearchIcon />}
              </InputAdornment>
            ),
          },
        }}
      />
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">Try:</Typography>
        {EXAMPLES.map((e) => (
          <Chip key={e} size="small" label={e} onClick={() => setQuery(e)} />
        ))}
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {!result && (
        <Section title="All festivals">
          <Grid container spacing={2}>
            {festivals.map((f) => (
              <Grid key={f.id} size={{ xs: 12, md: 6 }}>
                <FestivalCard festival={f} home={home} onOpen={onOpen} />
              </Grid>
            ))}
          </Grid>
        </Section>
      )}

      {result && (
        <>
          {result.festivals.length === 0 && result.bands.length === 0 && result.suggestions.length === 0 && (
            <Alert severity="info">Nothing matches "{result.query}".</Alert>
          )}

          {result.festivals.length > 0 && (
            <Section title="Festivals">
              <Grid container spacing={2}>
                {result.festivals.map((f) => (
                  <Grid key={f.id} size={{ xs: 12, md: 6 }}>
                    <FestivalCard festival={f} home={home} onOpen={onOpen} />
                  </Grid>
                ))}
              </Grid>
            </Section>
          )}

          {result.bands.length > 0 && (
            <Section title="Bands">
              <Stack spacing={1}>
                {result.bands.map((b) => (
                  <Paper key={b.name} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography sx={{ fontWeight: 700 }}>{b.name}</Typography>
                    <Stack direction="row" sx={{ mt: 0.5, gap: 1, flexWrap: 'wrap' }}>
                      {b.festivals.map((f) => (
                        <Chip
                          key={f.id}
                          color="primary"
                          variant="outlined"
                          label={`${f.name} · ${byId.get(f.id) ? formatDates(byId.get(f.id)!) : ''}`}
                          onClick={() => onOpen(f.id)}
                        />
                      ))}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Section>
          )}

          {result.suggestions.length > 0 && (
            <Section title={`Suggested festivals for "${result.query}"`}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Ranked by how many matching bands play and how well the festival's genres fit.
              </Alert>
              <Grid container spacing={2}>
                {result.suggestions.map((s) => (
                  <Grid key={s.festival.id} size={{ xs: 12, md: 6 }}>
                    <FestivalCard
                      festival={s.festival}
                      home={home}
                      onOpen={onOpen}
                      reasons={[...s.matchedGenres, ...s.matchedBands]}
                    />
                  </Grid>
                ))}
              </Grid>
            </Section>
          )}
        </>
      )}
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Box>
  );
}
