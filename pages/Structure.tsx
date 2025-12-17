
import React from 'react';
import { Code, FileCode, Smartphone, Coffee, Layers, Globe } from 'lucide-react';

export const Structure: React.FC = () => {
  const techs = [
    { name: 'HTML5', icon: <Globe size={40} />, desc: 'ESTRUTURA SEMÂNTICA E ACESSIBILIDADE WEB', color: 'bg-orange-600' },
    { name: 'CSS3 / TAILWIND', icon: <FileCode size={40} />, desc: 'ESTILIZAÇÃO RESPONSIVA E INDUSTRIAL', color: 'bg-blue-600' },
    { name: 'JAVASCRIPT / TS', icon: <Code size={40} />, desc: 'LÓGICA DE NEGÓCIOS E TIPAGEM ESTRITA', color: 'bg-yellow-500' },
    { name: 'FRAMEWORKS', icon: <Layers size={40} />, desc: 'REACT.JS, VITE, REMIX ROUTER', color: 'bg-cyan-600' },
    { name: 'REACT NATIVE', icon: <Smartphone size={40} />, desc: 'MÓDULO MOBILE (ANDROID/IOS) INTEGRADO', color: 'bg-purple-600' },
    { name: 'JAVA', icon: <Coffee size={40} />, desc: 'BACKEND E INTEGRAÇÕES CORPORATIVAS', color: 'bg-red-600' },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <h2 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3 uppercase tracking-tight">
        <Layers className="text-gray-800" size={32} />
        ESTRUTURA DO SISTEMA
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {techs.map((tech) => (
          <div key={tech.name} className="bg-white rounded-xl shadow-xl overflow-hidden hover:scale-105 transition-transform duration-300 group border border-gray-200">
             <div className={`${tech.color} p-8 flex justify-center items-center group-hover:opacity-90 transition-opacity`}>
                <div className="text-white drop-shadow-lg transform group-hover:scale-110 transition-transform">
                    {tech.icon}
                </div>
             </div>
             <div className="p-6">
                <h3 className="text-xl font-black text-gray-800 mb-2">{tech.name}</h3>
                <p className="text-gray-500 font-bold text-sm leading-relaxed">{tech.desc}</p>
             </div>
          </div>
        ))}
      </div>
      
      <div className="mt-12 bg-gray-900 text-white p-8 rounded-xl shadow-2xl border-l-8 border-green-500 relative overflow-hidden">
        <div className="relative z-10">
            <h3 className="text-2xl font-black mb-4">ARQUITETURA VALE SAFEMAINT</h3>
            <p className="text-gray-400 font-mono text-sm leading-relaxed font-bold">
                O SISTEMA UTILIZA UMA ARQUITETURA MODERNA BASEADA EM COMPONENTES (REACT), 
                COM PERSISTÊNCIA LOCAL SEGURA (STORAGE SERVICE) E INTERFACE RESPONSIVA (TAILWIND CSS).
                <br/><br/>
                PREPARADO PARA ESCALABILIDADE COM MÓDULOS NATIVOS (REACT NATIVE) E INTEGRAÇÃO LEGACY (JAVA).
            </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-green-500 opacity-10 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};
