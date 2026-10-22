import { useCallback, useEffect, useState } from 'react';
import {
  AppBar, Autocomplete, Box, Button, Container, Snackbar, Tab, Tabs, TextField, Toolbar, Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { api, type Festival, type Status } from './api';
import { HOME_PRESETS, type Home } from './utils';
import SearchTab from './SearchTab';
import CompareTab from './CompareTab';
import FestivalDialog from './FestivalDialog';

function loadHome(): Home {
  try {
    const saved = localStorage.getItem('home');
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore corrupt value
  }
  return HOME_PRESETS[0];
}

export default function App() {
  const [tab, setTab] = useState(0);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [home, setHome] = useState<Home>(loadHome);
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [f, s] = await Promise.all([api.festivals(), api.status()]);
    setFestivals(f);
    setStatus(s);
    return s;
  }, []);

  useEffect(() => {
    load().catch(() => setMessage('Could not reach the server.'));
  }, [load]);

  // Poll while the server is scraping so new data appears automatically.
  useEffect(() => {
    if (!status?.scraping) return;
    const t = setInterval(() => load().catch(() => undefined), 3000);
    return () => clearInterval(t);
  }, [status?.scraping, load]);

  const changeHome = (h: Home) => {
    setHome(h);
    localStorage.setItem('home', JSON.stringify(h));
  };

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (p) => changeHome({ name: 'My location', lat: p.coords.latitude, lon: p.coords.longitude }),
      () => setMessage('Location permission was denied.'),
    );
  };

  const rescrape = async () => {
    await api.scrape();
    setStatus((s) => (s ? { ...s, scraping: true } : s));
    setMessage('Re-scraping festival sites...');
  };

  return (
    <>
      <AppBar position="sticky" color="default" enableColorOnDark>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 1 }} color="primary">
            METAL FESTIVAL PLANNER
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Autocomplete
            size="small"
            sx={{ width: 220 }}
            options={home.name === 'My location' ? [home, ...HOME_PRESETS] : HOME_PRESETS}
            value={home}
            disableClearable
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(a, b) => a.name === b.name}
            onChange={(_, v) => changeHome(v)}
            renderInput={(params) => <TextField {...params} label="Travelling from" />}
          />
          <Button startIcon={<MyLocationIcon />} onClick={useMyLocation}>Use my location</Button>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            disabled={status?.scraping}
            onClick={rescrape}
          >
            {status?.scraping ? 'Scraping...' : 'Refresh data'}
          </Button>
        </Toolbar>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} centered>
          <Tab label="Search" />
          <Tab label="Compare festivals" />
        </Tabs>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {tab === 0 && <SearchTab festivals={festivals} home={home} onOpen={setOpenId} />}
        {tab === 1 && <CompareTab festivals={festivals} home={home} onOpen={setOpenId} />}
        {status && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
            {status.festivalCount} festivals, {status.bandCount} distinct bands.{' '}
            {status.updatedAt ? `Last scraped ${new Date(status.updatedAt).toLocaleString()}.` : 'Not scraped yet.'}{' '}
            Prices in other currencies are converted to EUR at approximate fixed rates.
          </Typography>
        )}
      </Container>

      <FestivalDialog id={openId} home={home} onClose={() => setOpenId(null)} onOpen={setOpenId} />
      <Snackbar
        open={message !== null}
        autoHideDuration={4000}
        message={message}
        onClose={() => setMessage(null)}
      />
    </>
  );
}
