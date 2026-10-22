import type { Festival } from './api';

export interface Home {
  name: string;
  lat: number;
  lon: number;
}

export const HOME_PRESETS: Home[] = [
  { name: 'Copenhagen', lat: 55.6761, lon: 12.5683 },
  { name: 'Aarhus', lat: 56.1629, lon: 10.2039 },
  { name: 'Amsterdam', lat: 52.3676, lon: 4.9041 },
  { name: 'Berlin', lat: 52.52, lon: 13.405 },
  { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
  { name: 'Helsinki', lat: 60.1699, lon: 24.9384 },
  { name: 'London', lat: 51.5072, lon: -0.1276 },
  { name: 'Madrid', lat: 40.4168, lon: -3.7038 },
  { name: 'Oslo', lat: 59.9139, lon: 10.7522 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  { name: 'Prague', lat: 50.0755, lon: 14.4378 },
  { name: 'Rome', lat: 41.9028, lon: 12.4964 },
  { name: 'Stockholm', lat: 59.3293, lon: 18.0686 },
  { name: 'Vienna', lat: 48.2082, lon: 16.3738 },
  { name: 'Warsaw', lat: 52.2297, lon: 21.0122 },
];

export function distanceKm(home: Home, f: Pick<Festival, 'lat' | 'lon'>): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(f.lat - home.lat);
  const dLon = rad(f.lon - home.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(home.lat)) * Math.cos(rad(f.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export function formatDates(f: Pick<Festival, 'startDate' | 'endDate'>): string {
  if (!f.startDate) return 'Dates TBA';
  const start = new Date(f.startDate);
  if (!f.endDate) return dateFmt.format(start);
  return `${dayFmt.format(start)} – ${dateFmt.format(new Date(f.endDate))}`;
}

export function formatPrice(f: Festival): string {
  if (f.priceAmount == null) return 'Not announced';
  const n = Number.isInteger(f.priceAmount) ? f.priceAmount.toString() : f.priceAmount.toFixed(2);
  return `${n} ${f.priceCurrency ?? ''}`.trim();
}

export const STATUS_LABEL: Record<Festival['ticketStatus'], string> = {
  OnSale: 'On sale',
  SoldOut: 'Sold out',
  NotYetOnSale: 'Not on sale yet',
  Unknown: 'Unknown',
};

export const STATUS_COLOR: Record<Festival['ticketStatus'], 'success' | 'error' | 'warning' | 'default'> = {
  OnSale: 'success',
  SoldOut: 'error',
  NotYetOnSale: 'warning',
  Unknown: 'default',
};

export const mapsUrl = (f: Pick<Festival, 'lat' | 'lon'>) =>
  `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lon}`;
