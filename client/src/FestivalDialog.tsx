import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, IconButton, Link,
  Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { api, type FestivalDetail } from './api';
import {
  STATUS_COLOR, STATUS_LABEL, distanceKm, formatDates, formatPrice, mapsUrl, type Home,
} from './utils';

interface Props {
  id: string | null;
  home: Home;
  onClose: () => void;
  onOpen: (id: string) => void;
}

export default function FestivalDialog({ id, home, onClose, onOpen }: Props) {
  const [detail, setDetail] = useState<FestivalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setDetail(null);
    setError(null);
    setFilter('');
    if (!id) return;
    api.festival(id).then(setDetail).catch((e: Error) => setError(e.message));
  }, [id]);

  const shared = useMemo(() => detail?.bands.filter((b) => b.otherFestivals.length > 0) ?? [], [detail]);
  const bands = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (detail?.bands ?? []).filter((b) => !q || b.name.toLowerCase().includes(q));
  }, [detail, filter]);

  const f = detail?.festival;

  return (
    <Dialog open={id !== null} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ pr: 7 }}>
        {f?.name ?? 'Loading...'}
        <IconButton aria-label="close" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error">{error}</Alert>}
        {!f && !error && <CircularProgress />}
        {f && detail && (
          <Stack spacing={2}>
            <Box>
              <Typography>
                {f.city}, {f.country}
                {f.venue && ` (${f.venue})`} · {Math.round(distanceKm(home, f)).toLocaleString()} km from{' '}
                {home.name} ·{' '}
                <Link href={mapsUrl(f)} target="_blank" rel="noopener noreferrer">View on map</Link>
              </Typography>
              <Typography>{formatDates(f)} · <Link href={f.website} target="_blank" rel="noopener noreferrer">Official site</Link></Typography>
              <Stack direction="row" sx={{ mt: 1, gap: 1, flexWrap: 'wrap' }}>
                {f.genres.map((g) => <Chip key={g} size="small" label={g} />)}
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 700 }}>{formatPrice(f)}</Typography>
              {f.priceLabel && <Typography variant="body2" color="text.secondary">{f.priceLabel}</Typography>}
              <Chip size="small" label={STATUS_LABEL[f.ticketStatus]} color={STATUS_COLOR[f.ticketStatus]} />
              {f.ticketUrl && (
                <Button
                  variant="contained"
                  href={f.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {f.ticketStatus === 'OnSale' ? 'Buy tickets' : 'Ticket page'}
                </Button>
              )}
            </Box>

            {f.note && <Alert severity="info">{f.note}</Alert>}
            {f.lineupError && <Alert severity="warning">{f.lineupError}</Alert>}

            {shared.length > 0 && (
              <Alert severity="warning" icon={<SwapHorizIcon />}>
                <Typography sx={{ fontWeight: 700 }}>
                  {shared.length} of {detail.bands.length} bands here also play other festivals
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {shared.map((b) => (
                    <Typography key={b.name} variant="body2">
                      <b>{b.name}</b> also plays: {b.otherFestivals.map((o, i) => (
                        <span key={o.id}>
                          {i > 0 && ', '}
                          <Link component="button" type="button" onClick={() => onOpen(o.id)} sx={{ verticalAlign: 'baseline' }}>
                            {o.name}
                          </Link>
                        </span>
                      ))}
                    </Typography>
                  ))}
                </Stack>
              </Alert>
            )}

            <Divider />
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="h6">Line-up ({detail.bands.length})</Typography>
              {detail.bands.length > 0 && (
                <TextField size="small" label="Filter bands" value={filter} onChange={(e) => setFilter(e.target.value)} />
              )}
            </Stack>

            {detail.bands.length === 0 && !f.lineupError && (
              <Typography color="text.secondary">No line-up available yet.</Typography>
            )}

            <Stack divider={<Divider flexItem />}>
              {bands.map((b) => (
                <Box key={b.name} sx={{ py: 0.75, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ minWidth: 220 }}>{b.name}</Typography>
                  {b.genre && <Chip size="small" variant="outlined" label={b.genre} />}
                  {b.otherFestivals.map((o) => (
                    <Tooltip key={o.id} title={`${b.name} also plays ${o.name}`}>
                      <Chip
                        size="small"
                        color="secondary"
                        icon={<SwapHorizIcon />}
                        label={o.name}
                        onClick={() => onOpen(o.id)}
                      />
                    </Tooltip>
                  ))}
                </Box>
              ))}
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
