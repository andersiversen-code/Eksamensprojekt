import { Box, Button, Card, CardActionArea, CardActions, CardContent, Chip, Stack, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import EventIcon from '@mui/icons-material/Event';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import type { Festival } from './api';
import { STATUS_COLOR, STATUS_LABEL, distanceKm, formatDates, formatPrice, type Home } from './utils';

interface Props {
  festival: Festival;
  home: Home;
  onOpen: (id: string) => void;
  reasons?: string[];
}

export default function FestivalCard({ festival: f, home, onOpen, reasons }: Props) {
  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={() => onOpen(f.id)} sx={{ flexGrow: 1, alignItems: 'flex-start' }}>
        <CardContent>
          <Typography variant="h6">{f.name}</Typography>
          <Stack spacing={0.5} sx={{ my: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlaceIcon fontSize="small" color="primary" />
              <Typography variant="body2">
                {f.city}, {f.country} · {Math.round(distanceKm(home, f)).toLocaleString()} km from {home.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventIcon fontSize="small" color="primary" />
              <Typography variant="body2">{formatDates(f)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ConfirmationNumberIcon fontSize="small" color="primary" />
              <Typography variant="body2">{formatPrice(f)}</Typography>
              <Chip size="small" label={STATUS_LABEL[f.ticketStatus]} color={STATUS_COLOR[f.ticketStatus]} />
            </Box>
          </Stack>
          {f.topBands.length > 0 ? (
            <Typography variant="body2" color="text.secondary">
              {f.topBands.join(' · ')}
              {f.bandCount > f.topBands.length && ` · +${f.bandCount - f.topBands.length} more`}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">Line-up not available</Typography>
          )}
          {reasons && reasons.length > 0 && (
            <Stack direction="row" sx={{ mt: 1, gap: 0.5, flexWrap: 'wrap' }}>
              {reasons.map((r) => (
                <Chip key={r} size="small" color="secondary" variant="outlined" label={r} />
              ))}
            </Stack>
          )}
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" onClick={() => onOpen(f.id)}>Line-up</Button>
        {f.ticketUrl && (
          <Button size="small" href={f.ticketUrl} target="_blank" rel="noopener noreferrer">
            Tickets
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
