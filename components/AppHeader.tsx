
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
    <header className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 animate-fadeIn print:hidden">
      <div className="flex items-center gap-4">
        {/* Date */}
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
          <Calendar size={20} className="text-[#007e7a]" />
          <span className="text-sm font-black text-gray-800 uppercase tracking-wide">{formatDate(currentTime)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Weather */}
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 text-blue-900">
          {weather.temp !== null ? (
            <>
              <Thermometer size={20} className="text-blue-600" />
              <span className="text-sm font-black uppercase">{weather.temp}°C {weather.city && <span className="text-blue-600/70 ml-1 text-xs">EM {weather.city}</span>}</span>
            </>
          ) : (
             <span className="text-xs font-bold text-blue-400 uppercase">{weatherError || 'Carregando clima...'}</span>
          )}
        </div>
        
        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 hidden md:block"></div>
        
        {/* Time */}
        <div className="flex items-center gap-3 bg-gray-900 px-5 py-2 rounded-xl text-white shadow-lg shadow-gray-200">
          <Clock size={20} className="text-[#edb111]" />
          <span className="font-mono text-xl font-black tracking-widest leading-none">
            {currentTime.toLocaleTimeString('pt-BR')}
          </span>
        </div>
      </div>
    </header>
  );
};
