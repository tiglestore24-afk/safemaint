
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Thermometer } from 'lucide-react';

// Helper to format date
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const AppHeader: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number | null, city: string | null }>({ temp: null, city: null });
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather fetch
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Fetch weather data from Open-Meteo
            const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            if (!weatherResponse.ok) throw new Error('Weather API failed');
            const weatherData = await weatherResponse.json();
            
            // Fetch city name for context using Nominatim (reverse geocoding)
            const cityResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            if (!cityResponse.ok) throw new Error('Geolocation API failed');
            const cityData = await cityResponse.json();
            
            setWeather({
              temp: Math.round(weatherData.current_weather.temperature),
              city: cityData.address?.city || cityData.address?.town || 'Local'
            });
            setWeatherError(null);
          } catch (error) {
            console.error("Weather fetch error:", error);
            setWeatherError("Clima indisponível");
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setWeatherError("Geolocalização negada");
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    } else {
      setWeatherError("Geolocalização não suportada");
    }
  }, []);

  return (
    <header className="bg-white/80 backdrop-blur-md p-3 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-2 animate-fadeIn print:hidden">
      <div className="flex items-center gap-3">
        {/* Date */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-500" />
          <span className="text-xs font-bold text-gray-700 uppercase">{formatDate(currentTime)}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* Weather */}
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
          {weather.temp !== null ? (
            <>
              <Thermometer size={16} className="text-blue-500" />
              <span className="text-xs font-bold text-gray-700 uppercase">{weather.temp}°C {weather.city && `EM ${weather.city}`}</span>
            </>
          ) : (
             <span className="text-xs font-bold text-gray-400 uppercase">{weatherError || 'Carregando clima...'}</span>
          )}
        </div>
        <div className="w-px h-6 bg-gray-200 hidden md:block"></div>
        {/* Time */}
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-gray-500" />
          <span className="font-mono text-sm font-black text-gray-800 tracking-wider">
            {currentTime.toLocaleTimeString('pt-BR')}
          </span>
        </div>
      </div>
    </header>
  );
};
