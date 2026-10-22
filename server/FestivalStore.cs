using System.Text.Json;

namespace MetalFestivals;

public sealed class FestivalStore
{
    private sealed class BandEntry
    {
        public required string Name { get; set; }
        public bool FromText { get; set; }
        public List<string> FestivalIds { get; } = [];
    }

    private sealed class Index
    {
        public required Snapshot Snapshot { get; init; }
        public Dictionary<string, BandEntry> Bands { get; } = [];
    }

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<FestivalStore> _log;
    private readonly string _cachePath;
    private readonly SemaphoreSlim _scrapeLock = new(1, 1);
    private volatile Index _index;

    public IReadOnlyList<FestivalDef> Defs { get; }
    public bool Scraping { get; private set; }

    public FestivalStore(IWebHostEnvironment env, IHttpClientFactory httpFactory, ILogger<FestivalStore> log)
    {
        _httpFactory = httpFactory;
        _log = log;

        var dataDir = Path.Combine(env.ContentRootPath, "data");
        _cachePath = Path.Combine(dataDir, "scrape-cache.json");

        Defs = JsonSerializer.Deserialize<List<FestivalDef>>(
                   File.ReadAllText(Path.Combine(dataDir, "festivals.json")), Json)
               ?? throw new InvalidOperationException("festivals.json is empty.");

        var snapshot = new Snapshot();
        if (File.Exists(_cachePath))
        {
            try { snapshot = JsonSerializer.Deserialize<Snapshot>(File.ReadAllText(_cachePath), Json) ?? snapshot; }
            catch (JsonException) { _log.LogWarning("Ignoring unreadable scrape cache."); }
        }
        _index = BuildIndex(snapshot);
    }

    public DateTime? UpdatedAt => _index.Snapshot.UpdatedAt;

    public async Task RefreshAsync(CancellationToken ct)
    {
        if (!await _scrapeLock.WaitAsync(0, ct)) return;
        try
        {
            Scraping = true;
            var http = _httpFactory.CreateClient("scraper");
            using var gate = new SemaphoreSlim(4);

            var tasks = Defs.Select(async d =>
            {
                await gate.WaitAsync(ct);
                try
                {
                    var r = await Scraper.ScrapeAsync(http, d, ct);
                    _log.LogInformation("{Festival}: {Count} bands{Error}", d.Name, r.Bands.Count,
                        r.Error is null ? "" : " - " + r.Error);
                    return (d.Id, Result: r);
                }
                finally { gate.Release(); }
            }).ToList();

            var snapshot = new Snapshot { UpdatedAt = DateTime.UtcNow };
            foreach (var (id, result) in await Task.WhenAll(tasks))
                snapshot.Festivals[id] = result;

            Directory.CreateDirectory(Path.GetDirectoryName(_cachePath)!);
            await File.WriteAllTextAsync(_cachePath, JsonSerializer.Serialize(snapshot, Json), ct);
            _index = BuildIndex(snapshot);
        }
        finally
        {
            Scraping = false;
            _scrapeLock.Release();
        }
    }

    private Index BuildIndex(Snapshot snapshot)
    {
        var index = new Index { Snapshot = snapshot };
        foreach (var def in Defs)
        {
            if (!snapshot.Festivals.TryGetValue(def.Id, out var scrape)) continue;
            foreach (var band in scrape.Bands)
            {
                var key = Text.Key(band.Name);
                if (!index.Bands.TryGetValue(key, out var entry))
                    index.Bands[key] = entry = new BandEntry { Name = band.Name, FromText = band.FromText };
                else if (!entry.FromText && band.FromText)
                {
                    entry.Name = band.Name;
                    entry.FromText = true;
                }
                if (!entry.FestivalIds.Contains(def.Id)) entry.FestivalIds.Add(def.Id);
            }
        }
        return index;
    }

    public StatusInfo Status() =>
        new(UpdatedAt, Scraping, Defs.Count, _index.Bands.Count);

    private static IEnumerable<T> ByDate<T>(IEnumerable<T> items, Func<T, string?> date, Func<T, string> name) =>
        items.OrderBy(i => date(i) ?? "9999").ThenBy(name);

    public FestivalSummary[] List() =>
        ByDate(Defs, d => d.StartDate, d => d.Name).Select(d => Summary(d, _index)).ToArray();

    public FestivalDetail? Detail(string id)
    {
        var index = _index;
        var def = Defs.FirstOrDefault(d => d.Id == id);
        if (def is null) return null;

        index.Snapshot.Festivals.TryGetValue(id, out var scrape);
        var bands = (scrape?.Bands ?? []).Select(b =>
        {
            var entry = index.Bands[Text.Key(b.Name)];
            var others = entry.FestivalIds.Where(x => x != id).Select(x => Ref(x)).ToArray();
            return new BandInFestival(entry.Name, b.Genre, others);
        }).ToArray();

        return new FestivalDetail(Summary(def, index), bands);
    }

    public SearchResult Search(string query)
    {
        var index = _index;
        var q = query.Trim();
        var qKey = Text.Key(q);
        if (qKey.Length == 0) return new SearchResult(q, [], [], []);

        var festivals = ByDate(
                Defs.Where(d => Text.Key($"{d.Name} {d.City} {d.Country}").Contains(qKey)),
                d => d.StartDate, d => d.Name)
            .Select(d => Summary(d, index)).ToArray();

        var bands = index.Bands
            .Where(kv => kv.Key.Contains(qKey))
            .OrderByDescending(kv => kv.Key == qKey).ThenBy(kv => kv.Value.Name)
            .Take(30)
            .Select(kv => new BandResult(kv.Value.Name, kv.Value.FestivalIds.Select(Ref).ToArray()))
            .ToArray();

        // Genre/band suggestion: score festivals by matching bands and genre tags.
        var tokens = q.Split([' ', ',', '/'], StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.ToLowerInvariant()).Where(t => t.Length >= 3).ToArray();

        var suggestions = new List<Suggestion>();
        foreach (var def in Defs)
        {
            var score = 0;
            var matchedBands = new List<string>();
            var matchedGenres = new List<string>();

            index.Snapshot.Festivals.TryGetValue(def.Id, out var scrape);
            foreach (var b in scrape?.Bands ?? [])
            {
                var bKey = Text.Key(b.Name);
                if (bKey == qKey) { score += 10; matchedBands.Add(b.Name); }
                else if (qKey.Length >= 3 && bKey.Contains(qKey)) { score += 4; matchedBands.Add(b.Name); }

                if (b.Genre is not null && tokens.Length > 0 && tokens.All(t => b.Genre.Contains(t, StringComparison.OrdinalIgnoreCase)))
                {
                    score += 1;
                    matchedBands.Add(b.Name);
                }
            }

            foreach (var g in def.Genres)
            {
                if (tokens.Length > 0 && tokens.All(t => g.Contains(t, StringComparison.OrdinalIgnoreCase)))
                {
                    score += 3;
                    matchedGenres.Add(g);
                }
            }

            if (score > 0)
                suggestions.Add(new Suggestion(Summary(def, index), score,
                    matchedBands.Distinct().Take(12).ToArray(), matchedGenres.ToArray()));
        }

        return new SearchResult(q, festivals, bands,
            suggestions.OrderByDescending(s => s.Score).ThenBy(s => s.Festival.StartDate ?? "9999").ToArray());
    }

    private FestivalRef Ref(string id)
    {
        var d = Defs.First(x => x.Id == id);
        return new FestivalRef(d.Id, d.Name, d.StartDate);
    }

    private static FestivalSummary Summary(FestivalDef d, Index index)
    {
        index.Snapshot.Festivals.TryGetValue(d.Id, out var scrape);
        var amount = scrape?.ScrapedPrice ?? d.Ticket.Amount;
        return new FestivalSummary(
            d.Id, d.Name, d.Country, d.City, d.Venue, d.Lat, d.Lon, d.StartDate, d.EndDate, d.Website, d.Genres,
            d.Ticket.Status, d.Ticket.Url, amount, d.Ticket.Currency, d.Ticket.Label,
            Text.ToEur(amount, d.Ticket.Currency), scrape?.ScrapedPrice is not null,
            scrape?.Bands.Count ?? 0, (scrape?.Bands ?? []).Take(8).Select(b => b.Name).ToArray(),
            d.Note, scrape?.Error, scrape?.ScrapedAt);
    }
}
