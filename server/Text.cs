using System.Globalization;
using System.Text;

namespace MetalFestivals;

public static class Text
{
    // Normalised key used to match the same band across festivals.
    public static string Key(string name)
    {
        var s = name.Trim();
        if (s.StartsWith("the ", StringComparison.OrdinalIgnoreCase)) s = s[4..];

        var sb = new StringBuilder(s.Length);
        foreach (var ch in s.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
            var c = char.ToLowerInvariant(ch);
            switch (c)
            {
                case 'ł': sb.Append('l'); break;
                case 'ø': sb.Append('o'); break;
                case 'đ': sb.Append('d'); break;
                case 'æ': sb.Append("ae"); break;
                case 'œ': sb.Append("oe"); break;
                case 'ß': sb.Append("ss"); break;
                default:
                    if (char.IsLetterOrDigit(c)) sb.Append(c);
                    break;
            }
        }
        return sb.ToString();
    }

    public static string FromSlug(string slug)
    {
        var s = Uri.UnescapeDataString(slug).Replace("__", " ").Replace('-', ' ').Replace('_', ' ');
        s = string.Join(' ', s.Split(' ', StringSplitOptions.RemoveEmptyEntries));
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(s.ToLowerInvariant());
    }

    public static string CleanText(string s)
    {
        s = string.Join(' ', s.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        var hasLower = s.Any(char.IsLower);
        return !hasLower && (s.Contains(' ') || (s.Length >= 6 && s.All(char.IsLetter)))
            ? CultureInfo.InvariantCulture.TextInfo.ToTitleCase(s.ToLowerInvariant())
            : s;
    }

    private static readonly Dictionary<string, decimal> EurRates = new()
    {
        ["EUR"] = 1m, ["SEK"] = 0.091m, ["NOK"] = 0.086m, ["DKK"] = 0.134m, ["GBP"] = 1.16m, ["CZK"] = 0.041m,
        ["RON"] = 0.20m,
    };

    // Approximate, fixed rates: only meant for side-by-side comparison.
    public static decimal? ToEur(decimal? amount, string? currency) =>
        amount is null || currency is null || !EurRates.TryGetValue(currency, out var r)
            ? null
            : Math.Round(amount.Value * r, 0);
}
