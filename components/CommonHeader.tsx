
import React, { useState, useEffect } from 'react';
import { HeaderData, MaintenanceType, OMRecord } from '../types';
import { Wrench, Zap, Droplets, Flame, MoreHorizontal, Search, List, X, CheckCircle2, Info } from 'lucide-react';
import { StorageService } from '../services/storage';

interface CommonHeaderProps {
  data: HeaderData;
  onChange: (data: HeaderData) => void;
  readOnly?: boolean;
  title?: string;
}

const TYPE_OPTIONS: { id: MaintenanceType; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'MECANICA', label: 'Mecânica', icon: <Wrench size={18} />, color: 'bg-blue-600' },
  { id: 'ELETRICA', label: 'Elétrica', icon: <Zap size={18} />, color: 'bg-yellow-500' },
  { id: 'LUBRIFICACAO', label: 'Lubrificação', icon: <Droplets size={18} />, color: 'bg-teal-600' },
  { id: 'SOLDA', label: 'Solda', icon: <Flame size={18} />, color: 'bg-orange-600' },
  { id: 'OUTROS', label: 'Outros', icon: <MoreHorizontal size={18} />, color: 'bg-gray-600' },
];

export const CommonHeader: React.FC<CommonHeaderProps> = ({ 
  data, 
  onChange, 
  readOnly = false,
  title = "Identificação da Manutenção" 
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [availableOms, setAvailableOms] = useState<OMRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isPickerOpen) {
      const oms = StorageService.getOMs().filter(o => o.status !== 'CONCLUIDA');
      setAvailableOms(oms);
    }
  }, [isPickerOpen]);

  const handleChange = (field: keyof HeaderData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const selectOM = (om: OMRecord) => {
    onChange({
      ...data,
      om: om.omNumber,
      tag: om.tag,
      description: om.description
    });
    setIsPickerOpen(false);
  };

  const filteredOms = availableOms.filter(o => 
    o.omNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded-3xl shadow-lg mb-6 border-l-8 border-vale-green animate-fadeIn relative">
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="bg-vale-green/10 p-2 rounded-xl">
             <Wrench size={20} className="text-vale-green" />
          </div>
          <h3 className="text-lg font-black text-vale-darkgray uppercase tracking-tighter">{title}</h3>
        </div>
        
        {!readOnly && (
          <button 
            onClick={() => setIsPickerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-vale-blue text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-md active:scale-95"
          >
            <List size={14} /> Selecionar OM Ativa
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Número da OM</label>
          <div className="relative">
            <input
              type="text"
              value={data.om}
              onChange={(e) => handleChange('om', e.target.value.toUpperCase())}
              disabled={readOnly}
              className="w-full rounded-2xl border-2 border-gray-100 focus:border-vale-green focus:ring-4 focus:ring-vale-green/5 bg-gray-50 p-3.5 font-black text-lg text-blue-900 outline-none transition-all uppercase placeholder:text-gray-300"
              placeholder="000000"
            />
          </div>
        </div>
        
        <div className="md:col-span-1">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Tag / Equipamento</label>
          <input
            type="text"
            value={data.tag}
            onChange={(e) => handleChange('tag', e.target.value.toUpperCase())}
            disabled={readOnly}
            className="w-full rounded-2xl border-2 border-gray-100 focus:border-vale-green focus:ring-4 focus:ring-vale-green/5 bg-gray-50 p-3.5 font-black text-lg text-vale-green outline-none transition-all uppercase placeholder:text-gray-300"
            placeholder="CA-53XX"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Data da Atividade</label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => handleChange('date', e.target.value)}
            disabled={readOnly}
            className="w-full rounded-2xl border-2 border-gray-100 focus:border-vale-green focus:ring-4 focus:ring-vale-green/5 bg-gray-50 p-3.5 font-bold outline-none transition-all"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Hora Início</label>
          <input
            type="time"
            value={data.time}
            onChange={(e) => handleChange('time', e.target.value)}
            disabled={readOnly}
            className="w-full rounded-2xl border-2 border-gray-100 focus:border-vale-green focus:ring-4 focus:ring-vale-green/5 bg-gray-50 p-3.5 font-bold outline-none transition-all"
          />
        </div>

        <div className="md:col-span-4">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">Tipo de Especialidade</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={readOnly}
                onClick={() => handleChange('type', opt.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-[10px] uppercase transition-all border-2
                  ${data.type === opt.id 
                    ? 'border-vale-green bg-vale-green text-white shadow-lg shadow-vale-green/20 scale-[1.02]' 
                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}
                  ${readOnly && data.type !== opt.id ? 'opacity-30' : 'opacity-100'}
                `}
              >
                <div className={`${data.type === opt.id ? 'text-white' : 'text-gray-400'}`}>
                  {opt.icon}
                </div>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-4">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Descrição Detalhada do Serviço</label>
          <textarea
            rows={3}
            value={data.description}
            onChange={(e) => handleChange('description', e.target.value.toUpperCase())}
            disabled={readOnly}
            className="w-full rounded-2xl border-2 border-gray-100 focus:border-vale-green focus:ring-4 focus:ring-vale-green/5 bg-gray-50 p-4 font-bold text-sm text-gray-700 outline-none transition-all uppercase placeholder:text-gray-300 resize-none"
            placeholder="DESCREVA A ATIVIDADE A SER REALIZADA..."
          />
        </div>
      </div>

      {/* MODAL SELETOR DE OM */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-[110] bg-vale-dark/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsPickerOpen(false)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.4)] border-b-[12px] border-vale-blue animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">Vincular Ordem (OM)</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Selecione uma ordem cadastrada para auto-preencher</p>
              </div>
              <button onClick={() => setIsPickerOpen(false)} className="p-2 bg-gray-200 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={28}/></button>
            </div>

            <div className="p-6 bg-gray-50 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="BUSCAR POR OM OU TAG..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value.toUpperCase())}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-200 rounded-2xl text-xs font-black uppercase outline-none focus:border-vale-blue transition-all shadow-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {filteredOms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                  <Info size={48} className="mb-4 opacity-20" />
                  <p className="font-black text-xs uppercase tracking-widest">Nenhuma OM pendente encontrada</p>
                </div>
              ) : (
                filteredOms.map(om => (
                  <div 
                    key={om.id} 
                    onClick={() => selectOM(om)}
                    className="p-5 bg-white border-2 border-gray-100 rounded-[1.5rem] flex justify-between items-center hover:border-vale-blue hover:bg-blue-50 cursor-pointer transition-all group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-black text-vale-blue group-hover:scale-105 transition-transform">{om.omNumber}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-black rounded uppercase border border-gray-200">{om.type}</span>
                      </div>
                      <p className="text-[11px] font-black text-vale-green uppercase tracking-widest">{om.tag}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase line-clamp-1 italic">{om.description}</p>
                    </div>
                    <CheckCircle2 size={24} className="text-gray-200 group-hover:text-vale-blue transition-colors" />
                  </div>
                ))
              )}
            </div>
            
            <div className="p-6 bg-gray-50 border-t text-center shrink-0">
              <p className="text-[9px] font-bold text-gray-400 uppercase">Ordens cadastradas via Central de Dados (Configurações)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
