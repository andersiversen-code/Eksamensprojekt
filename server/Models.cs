namespace MetalFestivals;

// ---- Festival definitions (data/festivals.json) ----

public sealed class FestivalDef
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Country { get; init; }
    public required string City { get; init; }
    public string? Venue { get; init; }
    public double Lat { get; init; }
    public double Lon { get; init; }
    public string? StartDate { get; init; }
    public string? EndDate { get; init; }
    public required string Website { get; init; }
    public string[] Genres { get; init; } = [];
    public TicketDef Ticket { get; init; } = new();
    public LineupSource? Lineup { get; init; }
    public string? Note { get; init; }
}

public sealed class TicketDef
{
    // OnSale | SoldOut | NotYetOnSale | Unknown
    public string Status { get; init; } = "Unknown";
    public string? Url { get; init; }
    public decimal? Amount { get; init; }
    public string? Currency { get; init; }
    public string? Label { get; init; }
    public string? PriceUrl { get; init; }
    // Must contain a named group "amount".
    public string? PriceRegex { get; init; }
}

public sealed class LineupSource
{
    public required string Url { get; init; }
    public string? LinkSelector { get; init; }
    public string? HrefRegex { get; init; }
    public string? NameSelector { get; init; }
    public string? GenreSelector { get; init; }
    public string? NameStripRegex { get; init; }
}

// ---- Scrape results (data/scrape-cache.json) ----

public sealed class ScrapedBand
{
    public required string Name { get; init; }
    public string? Genre { get; init; }
    // True when the name came from page text rather than a URL slug (slugs lose diacritics/casing).
    public bool FromText { get; init; }
}

public sealed class FestivalScrape
{
    public DateTime ScrapedAt { get; set; }
    public List<ScrapedBand> Bands { get; set; } = [];
    public decimal? ScrapedPrice { get; set; }
    public string? Error { get; set; }
}

public sealed class Snapshot
{
    public DateTime? UpdatedAt { get; set; }
    public Dictionary<string, FestivalScrape> Festivals { get; set; } = [];
}

// ---- API DTOs ----

public sealed record FestivalSummary(
    string Id, string Name, string Country, string City, string? Venue, double Lat, double Lon,
    string? StartDate, string? EndDate, string Website, string[] Genres,
    string TicketStatus, string? TicketUrl, decimal? PriceAmount, string? PriceCurrency, string? PriceLabel,
    decimal? PriceEur, bool PriceScraped, int BandCount, string[] TopBands, string? Note, string? LineupError,
    DateTime? ScrapedAt);

public sealed record FestivalRef(string Id, string Name, string? StartDate);

public sealed record BandInFestival(string Name, string? Genre, FestivalRef[] OtherFestivals);

public sealed record FestivalDetail(FestivalSummary Festival, BandInFestival[] Bands);

public sealed record BandResult(string Name, FestivalRef[] Festivals);

public sealed record Suggestion(FestivalSummary Festival, int Score, string[] MatchedBands, string[] MatchedGenres);

public sealed record SearchResult(
    string Query, FestivalSummary[] Festivals, BandResult[] Bands, Suggestion[] Suggestions);

public sealed record StatusInfo(DateTime? UpdatedAt, bool Scraping, int FestivalCount, int BandCount);
