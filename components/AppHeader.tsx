
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Thermometer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
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
            const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            if (!weatherResponse.ok) throw new Error('Weather API failed');
            const weatherData = await weatherResponse.json();
            
            const cityResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
                headers: {
                    'User-Agent': 'SAFEMAINT-Web-App/1.0',
                    'Accept-Language': 'pt-BR'
                }
            });
            
            let cityName = 'Local';
            if (cityResponse.ok) {
                const cityData = await cityResponse.json();
                cityName = cityData.address?.city || cityData.address?.town || cityData.address?.municipality || cityData.address?.village || 'Local';
            }
            
            setWeather({
              temp: Math.round(weatherData.current_weather.temperature),
              city: cityName
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
    <header className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 animate-fadeIn print:hidden relative z-40">
      <div className="flex items-center gap-4 w-full md:w-auto">
        {/* Date */}
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 flex-1 md:flex-none">
          <Calendar size={20} className="text-[#007e7a]" />
          <span className="text-sm font-black text-gray-800 uppercase tracking-wide truncate">{formatDate(currentTime)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 w-full md:w-auto justify-end">
        {/* Weather */}
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 text-blue-900 hidden md:flex">
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
        <div className="hidden md:flex items-center gap-3 bg-gray-900 px-5 py-2 rounded-xl text-white shadow-lg shadow-gray-200 min-w-[140px] justify-center">
          <Clock size={20} className="text-[#edb111]" />
          <span className="font-mono text-xl font-black tracking-widest leading-none">
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
    </header>
  );
};
