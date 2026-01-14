
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
        {/* Date - COR CHAMATIVA (Laranja/Vermelho) */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-xl shadow-lg shadow-orange-200 flex-1 md:flex-none transform transition-transform hover:scale-105 ring-2 ring-orange-100">
          <Calendar size={24} className="text-white" strokeWidth={2.5} />
          <span className="text-base font-black text-white uppercase tracking-wider truncate drop-shadow-sm">{formatDate(currentTime)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 w-full md:w-auto justify-end">
        {/* Weather - COR CHAMATIVA (Azul/Ciano) */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3 rounded-xl text-white shadow-lg shadow-blue-200 hidden md:flex transform transition-transform hover:scale-105 ring-2 ring-blue-100">
          {weather.temp !== null ? (
            <>
              <Thermometer size={22} className="text-white" strokeWidth={2.5} />
              <span className="text-sm font-black uppercase drop-shadow-sm">{weather.temp}°C {weather.city && <span className="text-white/90 ml-1 text-xs font-bold opacity-90 border-l border-white/30 pl-2">EM {weather.city}</span>}</span>
            </>
          ) : (
             <span className="text-xs font-bold text-white/80 uppercase">{weatherError || 'Carregando clima...'}</span>
          )}
        </div>
        
        {/* Divider */}
        <div className="w-px h-10 bg-gray-200 hidden md:block"></div>
        
        {/* Time - COR CHAMATIVA (Escuro/Neon) */}
        <div className="hidden md:flex items-center gap-3 bg-gray-900 px-6 py-3 rounded-xl text-white shadow-xl shadow-gray-300 min-w-[160px] justify-center border-2 border-gray-800 transform transition-transform hover:scale-105">
          <Clock size={22} className="text-[#edb111] animate-pulse" strokeWidth={2.5} />
          <span className="font-mono text-2xl font-black tracking-widest leading-none text-[#edb111] drop-shadow-[0_0_5px_rgba(237,177,17,0.5)]">
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
    </header>
  );
};
