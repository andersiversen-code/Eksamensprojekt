import { useMemo, useState } from 'react';
import {
  Button, Chip, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  Typography,
} from '@mui/material';
import type { Festival } from './api';
import { STATUS_COLOR, STATUS_LABEL, distanceKm, formatDates, formatPrice, type Home } from './utils';

type SortKey = 'name' | 'date' | 'distance' | 'price';

interface Props {
  festivals: Festival[];
  home: Home;
  onOpen: (id: string) => void;
}

export default function CompareTab({ festivals, home, onOpen }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('price');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');

  const rows = useMemo(() => {
    const value = (f: Festival): string | number | null => {
      switch (sortKey) {
        case 'name': return f.name;
        case 'date': return f.startDate;
        case 'distance': return distanceKm(home, f);
        case 'price': return f.priceEur;
      }
    };
    const sign = dir === 'asc' ? 1 : -1;
    // Missing values always sort last.
    return [...festivals].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (va == null && vb == null) return a.name.localeCompare(b.name);
      if (va == null) return 1;
      if (vb == null) return -1;
      return (typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number)) * sign;
    });
  }, [festivals, home, sortKey, dir]);

  const sort = (key: SortKey) => {
    if (key === sortKey) setDir(dir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setDir('asc');
    }
  };

  const head = (key: SortKey, label: string, align?: 'right') => (
    <TableCell align={align} sortDirection={sortKey === key ? dir : false}>
      <TableSortLabel active={sortKey === key} direction={sortKey === key ? dir : 'asc'} onClick={() => sort(key)}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Price is for the cheapest regular full-festival ticket we could find. Click a row for the line-up.
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {head('name', 'Festival')}
              {head('date', 'Dates')}
              <TableCell>Location</TableCell>
              {head('distance', `Distance from ${home.name}`, 'right')}
              {head('price', 'Ticket price', 'right')}
              <TableCell align="right">≈ EUR</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Buy</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((f) => (
              <TableRow key={f.id} hover sx={{ cursor: 'pointer' }} onClick={() => onOpen(f.id)}>
                <TableCell sx={{ fontWeight: 700 }}>{f.name}</TableCell>
                <TableCell>{formatDates(f)}</TableCell>
                <TableCell>{f.city}, {f.country}</TableCell>
                <TableCell align="right">{Math.round(distanceKm(home, f)).toLocaleString()} km</TableCell>
                <TableCell align="right">
                  {formatPrice(f)}
                  {f.priceLabel && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {f.priceLabel}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">{f.priceEur != null ? `≈ ${f.priceEur}` : '–'}</TableCell>
                <TableCell>
                  <Chip size="small" label={STATUS_LABEL[f.ticketStatus]} color={STATUS_COLOR[f.ticketStatus]} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {f.ticketUrl ? (
                    <Button size="small" component={Link} href={f.ticketUrl} target="_blank" rel="noopener noreferrer">
                      Tickets
                    </Button>
                  ) : (
                    '–'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
