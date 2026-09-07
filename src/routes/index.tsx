import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useCallback, useEffect, useState } from "react";

interface WeatherData {
  location: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  condition: string;
  icon: string;
  updatedAt: Date;
}

const QUICK_CITIES = ["Reykjavík", "Lisbon", "Nairobi", "Tokyo", "Austin"];

function getWeatherInfo(code: number) {
  if (code === 0) return { label: "Clear sky", icon: "☀️" };
  if (code === 1) return { label: "Mostly clear", icon: "🌤️" };
  if (code === 2) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Drizzle", icon: "🌦️" };
  if ([61, 63, 65, 66, 67].includes(code)) return { label: "Rain", icon: "🌧️" };
  if ([71, 73, 75, 77].includes(code)) return { label: "Snow", icon: "❄️" };
  if ([80, 81, 82].includes(code)) return { label: "Rain showers", icon: "🌦️" };
  if ([85, 86].includes(code)) return { label: "Snow showers", icon: "🌨️" };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Unknown", icon: "☁️" };
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z"
      />
    </svg>
  );
}

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      {getWeatherInfo(code).icon}
    </span>
  );
}

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Velamen · Live Weather" },
      {
        name: "description",
        content:
          "A fast, responsive weather dashboard. Search any city and get live temperature, humidity, wind, and conditions from Open-Meteo.",
      },
      { property: "og:title", content: "Velamen · Live Weather" },
      {
        property: "og:description",
        content:
          "A fast, responsive weather dashboard. Search any city and get live temperature, humidity, wind, and conditions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  const [query, setQuery] = useState("Reykjavík");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async (city: string) => {
    setLoading(true);
    setError(null);
    setWeather(null);

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      );
      if (!geoRes.ok) throw new Error("Network response was not ok.");
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error(
          `We couldn't find "${city}". Check the spelling or try a nearby city.`,
        );
      }

      const place = geoData.results[0];
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&wind_speed_unit=kmh&temperature_unit=celsius&timezone=auto`,
      );
      if (!weatherRes.ok) throw new Error("Weather service is unavailable. Please try again.");
      const weatherData = await weatherRes.json();
      const current = weatherData.current;
      const info = getWeatherInfo(current.weather_code);

      const location = [place.name, place.admin1, place.country]
        .filter(Boolean)
        .join(", ");

      setWeather({
        location,
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
        condition: info.label,
        icon: info.icon,
        updatedAt: new Date(),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while fetching the weather.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather(query);
  }, [fetchWeather]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const city = query.trim();
    if (!city) return;
    fetchWeather(city);
  };

  const handleQuickCity = (city: string) => {
    setQuery(city);
    fetchWeather(city);
  };

  return (
    <div className="relative min-h-screen w-full bg-background font-sans text-foreground antialiased">
      <div className="aurora pointer-events-none fixed inset-0 -z-10 opacity-90" />
      <div className="vignette pointer-events-none fixed inset-0 -z-10" />

      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 pt-8 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <span className="size-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Velamen</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">Live conditions</span>
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-12 sm:px-8 sm:pt-16">
        <section className="text-center">
          <h1 className="mx-auto max-w-[40ch] text-balance text-4xl font-semibold leading-none tracking-tight sm:text-5xl">
            Open the window, check the sky
          </h1>
          <p className="mx-auto mt-3 max-w-[48ch] text-pretty text-base text-muted-foreground">
            One city at a time. Crisp, calm, and instantly readable.
          </p>
        </section>

        <section className="mt-9">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-muted/70 p-2 ring-1 ring-border/40 backdrop-blur-xl"
          >
            <span className="pl-2 text-muted-foreground" aria-hidden="true">
              <SearchIcon className="size-4 shrink-0" />
            </span>
            <label htmlFor="city" className="sr-only">
              Search a city
            </label>
            <input
              id="city"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a city…"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background ring-1 ring-foreground/0 transition-colors hover:bg-muted-foreground disabled:opacity-50"
            >
              {loading ? "Loading…" : "Search"}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground">Quick:</span>
            {QUICK_CITIES.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => handleQuickCity(city)}
                disabled={loading}
                className="rounded-full border border-border/40 bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {city}
              </button>
            ))}
          </div>
        </section>

        {weather && !loading && (
          <section className="mt-10 animate-fadeup">
            <div className="rounded-3xl bg-card/80 p-6 ring-1 ring-border/40 backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Now
                  </p>
                  <h2 className="mt-1 text-lg font-medium tracking-tight">{weather.location}</h2>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/25">
                  {weather.condition}
                </span>
              </div>

              <div className="mt-7 flex flex-col items-center gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/25">
                    <WeatherIcon code={weather.weatherCode} className="text-4xl" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-6xl font-semibold leading-none tracking-tighter sm:text-7xl">
                      {Math.round(weather.temperature)}
                      <span className="align-top text-3xl text-muted-foreground">°C</span>
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {weather.condition}, {weather.windSpeed} km/h wind
                    </p>
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  Updated{" "}
                  {weather.updatedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-muted/70 p-4 ring-1 ring-border/40">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    Humidity
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{weather.humidity}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {weather.humidity > 70
                      ? "Humid"
                      : weather.humidity < 30
                        ? "Dry"
                        : "Comfortable"}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/70 p-4 ring-1 ring-border/40">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    Wind
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    {weather.windSpeed}{" "}
                    <span className="text-base font-normal text-muted-foreground">km/h</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Current breeze</p>
                </div>
                <div className="rounded-2xl bg-muted/70 p-4 ring-1 ring-border/40">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    Feels like
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    {Math.round(weather.apparentTemperature)}°
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {weather.apparentTemperature < weather.temperature
                      ? "Wind chill"
                      : "With humidity"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {loading && (
          <section className="mt-6 flex items-center justify-center gap-2.5 text-muted-foreground">
            <span
              className="size-3 animate-softpulse rounded-full bg-glowr"
              aria-hidden="true"
            />
            <span className="text-sm">Fetching live conditions…</span>
          </section>
        )}

        {error && !loading && (
          <section className="mt-6">
            <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-muted/60 p-4 ring-1 ring-warn/25">
              <span className="mt-0.5 shrink-0 text-warn" aria-hidden="true">
                <WarningIcon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">We couldn't load that forecast</p>
                <p className="mt-0.5 text-pretty text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="mx-auto w-full max-w-2xl px-5 pb-10 sm:px-8">
        <p className="text-center text-xs text-muted-foreground">
          Velamen · powered by Open-Meteo · no API key needed
        </p>
      </footer>
    </div>
  );
}
