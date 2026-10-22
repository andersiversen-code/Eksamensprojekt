export interface Festival {
  id: string;
  name: string;
  country: string;
  city: string;
  venue: string | null;
  lat: number;
  lon: number;
  startDate: string | null;
  endDate: string | null;
  website: string;
  genres: string[];
  ticketStatus: 'OnSale' | 'SoldOut' | 'NotYetOnSale' | 'Unknown';
  ticketUrl: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  priceLabel: string | null;
  priceEur: number | null;
  priceScraped: boolean;
  bandCount: number;
  topBands: string[];
  note: string | null;
  lineupError: string | null;
  scrapedAt: string | null;
}

export interface FestivalRef {
  id: string;
  name: string;
  startDate: string | null;
}

export interface Band {
  name: string;
  genre: string | null;
  otherFestivals: FestivalRef[];
}

export interface FestivalDetail {
  festival: Festival;
  bands: Band[];
}

export interface BandResult {
  name: string;
  festivals: FestivalRef[];
}

export interface Suggestion {
  festival: Festival;
  score: number;
  matchedBands: string[];
  matchedGenres: string[];
}

export interface SearchResult {
  query: string;
  festivals: Festival[];
  bands: BandResult[];
  suggestions: Suggestion[];
}

export interface Status {
  updatedAt: string | null;
  scraping: boolean;
  festivalCount: number;
  bandCount: number;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  festivals: () => get<Festival[]>('/api/festivals'),
  festival: (id: string) => get<FestivalDetail>(`/api/festivals/${encodeURIComponent(id)}`),
  search: (q: string) => get<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`),
  status: () => get<Status>('/api/status'),
  scrape: () => fetch('/api/scrape', { method: 'POST' }),
};
