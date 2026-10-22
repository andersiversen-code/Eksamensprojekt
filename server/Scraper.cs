using System.Globalization;
using System.Text.RegularExpressions;
using AngleSharp.Dom;
using AngleSharp.Html.Parser;

namespace MetalFestivals;

public static class Scraper
{
    public static async Task<FestivalScrape> ScrapeAsync(HttpClient http, FestivalDef f, CancellationToken ct)
    {
        var result = new FestivalScrape { ScrapedAt = DateTime.UtcNow };

        if (f.Lineup is { } src)
        {
            try { result.Bands = await ScrapeLineupAsync(http, src, ct); }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or RegexMatchTimeoutException)
            {
                result.Error = $"Line-up could not be fetched: {ex.Message}";
            }
            if (result.Error is null && result.Bands.Count == 0)
                result.Error = "No bands found on the line-up page (layout may have changed).";
        }

        if (f.Ticket is { PriceUrl: { } priceUrl, PriceRegex: { } priceRegex })
        {
            try
            {
                var text = await GetTextAsync(http, priceUrl, ct);
                var m = Regex.Match(text, priceRegex, RegexOptions.Singleline | RegexOptions.IgnoreCase,
                    TimeSpan.FromSeconds(2));
                if (m.Success && decimal.TryParse(m.Groups["amount"].Value.Replace(',', '.'),
                        NumberStyles.Number, CultureInfo.InvariantCulture, out var amount))
                    result.ScrapedPrice = amount;
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or RegexMatchTimeoutException)
            {
                // Falls back to the price in festivals.json.
            }
        }

        return result;
    }

    private static async Task<string> GetTextAsync(HttpClient http, string url, CancellationToken ct)
    {
        var html = await http.GetStringAsync(url, ct);
        var doc = await new HtmlParser().ParseDocumentAsync(html, ct);
        return doc.Body?.TextContent ?? "";
    }

    private static async Task<List<ScrapedBand>> ScrapeLineupAsync(HttpClient http, LineupSource src, CancellationToken ct)
    {
        var baseUri = new Uri(src.Url);
        var html = await http.GetStringAsync(baseUri, ct);
        var doc = await new HtmlParser().ParseDocumentAsync(html, ct);

        var hrefRe = src.HrefRegex is null ? null : new Regex(src.HrefRegex, RegexOptions.None, TimeSpan.FromSeconds(1));
        var stripRe = src.NameStripRegex is null
            ? null
            : new Regex(src.NameStripRegex, RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1));

        var bands = new Dictionary<string, ScrapedBand>();
        foreach (var a in doc.QuerySelectorAll(src.LinkSelector ?? "a[href]"))
        {
            var href = a.GetAttribute("href");
            if (string.IsNullOrWhiteSpace(href) || (hrefRe is not null && !hrefRe.IsMatch(href))) continue;

            string name;
            bool fromText;
            if (src.NameSelector is not null)
            {
                var raw = a.QuerySelector(src.NameSelector)?.TextContent;
                if (string.IsNullOrWhiteSpace(raw)) continue;
                name = Text.CleanText(raw);
                fromText = true;
                if (stripRe is not null) name = stripRe.Replace(name, "").Trim();
            }
            else
            {
                if (!Uri.TryCreate(baseUri, href, out var abs)) continue;
                var slug = abs.AbsolutePath.TrimEnd('/').Split('/').LastOrDefault();
                if (string.IsNullOrEmpty(slug)) continue;
                if (stripRe is not null) slug = stripRe.Replace(slug, "");
                name = Text.FromSlug(slug);
                fromText = false;
            }

            if (name.Length is 0 or > 80) continue;
            var key = Text.Key(name);
            if (key.Length == 0 || bands.ContainsKey(key)) continue;

            var genre = src.GenreSelector is null ? null : a.QuerySelector(src.GenreSelector)?.TextContent;
            genre = string.IsNullOrWhiteSpace(genre) ? null : Text.CleanText(genre);
            bands[key] = new ScrapedBand { Name = name, Genre = genre, FromText = fromText };
        }

        return [.. bands.Values];
    }
}
