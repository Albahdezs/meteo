import React, { useState, useEffect, useCallback } from "react";

// wmoCode es el código del clima
function getWeatherIcon(wmoCode) {
  const icons = new Map([
    [[0], "☀️"],
    [[1], "🌤"],
    [[2], "⛅️"],
    [[3], "☁️"],
    [[45, 48], "🌫"],
    [[51, 56, 61, 66, 80], "🌦"],
    [[53, 55, 63, 65, 57, 67, 81, 82], "🌧"],
    [[71, 73, 75, 77, 85, 86], "🌨"],
    [[95], "🌩"],
    [[96, 99], "⛈"],
  ]);
  
  // Array con find e includes para buscar el código meteorológico 
  const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
  return arr ? icons.get(arr) : "NOT FOUND";
}

// Convierte a flag el countryCode de la API 
function convertToFlag(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

// Formateo de la fecha
function formatDay(dateStr) {
  return new Intl.DateTimeFormat("es", { weekday: "short" }).format(
    new Date(dateStr)
  );
}

export default function App() {
  // Lazy inicialization. Si no encuentra location devuelve null 
  const [location, setLocation] = useState(
    () => localStorage.getItem("location") || ""
  );
  const [displayLocation, setDisplayLocation] = useState("");
  const [weather, setWeather] = useState({});
  const [isLoading, setIsLoading] = useState(false);

// useCallback para memorizar función y no recrearse en el useEffect
  const fetchWeather = useCallback(async () => {
    if (location.length < 2) {
      setWeather({});
      return;
    }

    setIsLoading(true);
    try {
      // 1) Geocoding
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${location}`
      );
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error("Location not found");
      }

      const { latitude, longitude, name, country_code } = geoData.results[0];
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "auto";
      setDisplayLocation(`${name} ${convertToFlag(country_code)}`);

      // 2) Fetch weather
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`
      );

      if (!weatherRes.ok) throw new Error("Weather fetch failed");

      const weatherData = await weatherRes.json();

      if (!weatherData.daily) {
        throw new Error("Weather data is missing");
      }

      setWeather(weatherData.daily);
    } catch (err) {
      console.error("Error fetching weather:", err);
      setWeather({});
    } finally {
      setIsLoading(false);
    }
  }, [location]);

// Petición una vez montada y con cada cambio de localización 
  useEffect(() => {
    fetchWeather();
    localStorage.setItem("location", location);
  }, [location, fetchWeather]);

  return (
    <div className="app">
      <h1>Meteo</h1>
      <Input value={location} onChange={(e) => setLocation(e.target.value)} />

      {isLoading && <p className="loader">Cargando...</p>}

      {weather.weathercode && (
        <Weather weather={weather} location={displayLocation} />
      )}
    </div>
  );
}

function Input({ value, onChange }) {
  return (
    <div>
      <input
        type="text"
        placeholder="Busca una ciudad..."
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function Weather({ weather, location }) {
  // Desmonta el componente para limpiarlo
  useEffect(() => {
    return () => console.log("Weather unmounted");
  }, []);
  
// Desestructuración del componente para trabajar mejor
  const {
    temperature_2m_max: max,
    temperature_2m_min: min,
    time: dates,
    weathercode: codes,
  } = weather;

  return (
    <div>
      <h2>El tiempo en {location}</h2>
      <ul className="weather">
        {dates.map((date, i) => {
          const todayStr = new Date().toISOString().split("T")[0];
          return (
            <Day
              key={date}
              date={date}
              max={max[i]}
              min={min[i]}
              code={codes[i]}
              isToday={date === todayStr}
            />
          );
        })}
      </ul>
    </div>
  );
}

function Day({ date, max, min, code, isToday }) {
  return (
    <li className={`day ${isToday ? "hoy" : ""}`}>
      <span>{getWeatherIcon(code)}</span>
      <p>{isToday ? "Hoy" : formatDay(date)}</p>
      <p>
        {Math.floor(min)}° — <strong>{Math.ceil(max)}°</strong>
      </p>
    </li>
  );
}
