using MetalFestivals;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient("scraper", c =>
{
    c.Timeout = TimeSpan.FromSeconds(30);
    c.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (compatible; MetalFestivalPlanner/1.0)");
    c.DefaultRequestHeaders.AcceptLanguage.ParseAdd("en");
});
builder.Services.AddSingleton<FestivalStore>();

var app = builder.Build();
var store = app.Services.GetRequiredService<FestivalStore>();

// Scrape in the background on first run or when the cache is older than 12 hours.
if (store.UpdatedAt is null || DateTime.UtcNow - store.UpdatedAt > TimeSpan.FromHours(12))
    _ = Task.Run(() => store.RefreshAsync(app.Lifetime.ApplicationStopping));

app.UseDefaultFiles();
app.UseStaticFiles();

var api = app.MapGroup("/api");
api.MapGet("/status", () => store.Status());
api.MapGet("/festivals", () => store.List());
api.MapGet("/festivals/{id}", (string id) =>
    store.Detail(id) is { } detail ? Results.Ok(detail) : Results.NotFound());
api.MapGet("/search", (string q) => store.Search(q));
api.MapPost("/scrape", (IHostApplicationLifetime life) =>
{
    if (!store.Scraping) _ = Task.Run(() => store.RefreshAsync(life.ApplicationStopping));
    return Results.Accepted();
});

app.MapFallbackToFile("index.html");

app.Run();
