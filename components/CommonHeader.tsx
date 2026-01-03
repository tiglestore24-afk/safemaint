
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
  { id: 'MECANICA', label: 'Mecânica', icon: <Wrench size={18} />, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'ELETRICA', label: 'Elétrica', icon: <Zap size={18} />, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { id: 'LUBRIFICACAO', label: 'Lubrificação', icon: <Droplets size={18} />, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { id: 'SOLDA', label: 'Solda', icon: <Flame size={18} />, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'OUTROS', label: 'Outros', icon: <MoreHorizontal size={18} />, color: 'text-gray-600 bg-gray-50 border-gray-200' },
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
      description: om.description,
      type: om.type === 'CORRETIVA' ? 'MECANICA' : 'MECANICA' // Default type, can be changed
    });
    setIsPickerOpen(false);
  };

  const filteredOms = availableOms.filter(o => 
    o.omNumber.includes(searchTerm.toUpperCase()) || 
    o.tag.includes(searchTerm.toUpperCase()) ||
    o.description.includes(searchTerm.toUpperCase())
  );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6 relative animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-gray-100 pb-3 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#007e7a]/10 p-2 rounded-lg">
             <Wrench size={20} className="text-[#007e7a]" />
          </div>
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-tighter">{title}</h3>
        </div>
        
        {!readOnly && (
          <button 
            onClick={() => setIsPickerOpen(true)}
            className="flex items-center gap-2 bg-[#007e7a] text-white px-4 py-2 rounded-lg font-bold text-xs uppercase shadow-sm hover:bg-[#00605d] transition-all active:scale-95"
          >
            <List size={16} /> Buscar na Carteira
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* OM Number */}
        <div className="relative group">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Ordem (OM)</label>
            <input 
                type="text" 
                value={data.om} 
                onChange={e => handleChange('om', e.target.value)}
                readOnly={readOnly}
                className={`w-full p-3 rounded-xl border-2 text-sm font-black text-gray-800 outline-none transition-all ${readOnly ? 'bg-gray-100 border-transparent text-gray-500' : 'bg-gray-50 border-gray-100 focus:bg-white focus:border-[#007e7a] focus:ring-4 focus:ring-[#007e7a]/10'}`}
                placeholder=""
            />
        </div>

        {/* TAG */}
        <div className="relative group">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Tag Equipamento</label>
            <input 
                type="text" 
                value={data.tag} 
                onChange={e => {
                    const val = e.target.value.toUpperCase().replace(/^([0-9])/, 'CA$1');
                    handleChange('tag', val);
                }}
                readOnly={readOnly}
                className={`w-full p-3 rounded-xl border-2 text-sm font-black text-[#007e7a] outline-none transition-all ${readOnly ? 'bg-gray-100 border-transparent text-gray-500' : 'bg-gray-50 border-gray-100 focus:bg-white focus:border-[#007e7a] focus:ring-4 focus:ring-[#007e7a]/10'}`}
                placeholder=""
            />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Data</label>
                <input 
                    type="date" 
                    value={data.date} 
                    onChange={e => handleChange('date', e.target.value)}
                    readOnly={readOnly}
                    className={`w-full p-3 rounded-xl border-2 text-xs font-bold text-gray-700 outline-none transition-all ${readOnly ? 'bg-gray-100 border-transparent' : 'bg-gray-50 border-gray-100 focus:bg-white focus:border-[#007e7a]'}`}
                />
            </div>
            <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Hora</label>
                <input 
                    type="time" 
                    value={data.time} 
                    onChange={e => handleChange('time', e.target.value)}
                    readOnly={readOnly}
                    className={`w-full p-3 rounded-xl border-2 text-xs font-bold text-gray-700 outline-none transition-all ${readOnly ? 'bg-gray-100 border-transparent' : 'bg-gray-50 border-gray-100 focus:bg-white focus:border-[#007e7a]'}`}
                />
            </div>
        </div>

        {/* Type Selection */}
        <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Especialidade</label>
            <div className="relative">
                <select 
                    value={data.type} 
                    onChange={e => handleChange('type', e.target.value)}
                    disabled={readOnly}
                    className={`w-full p-3 rounded-xl border-2 text-xs font-black uppercase outline-none appearance-none transition-all ${readOnly ? 'bg-gray-100 border-transparent text-gray-500' : 'bg-gray-50 border-gray-100 focus:bg-white focus:border-[#007e7a] text-gray-700'}`}
                >
                    {TYPE_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    {TYPE_OPTIONS.find(t => t.id === data.type)?.icon}
                </div>
            </div>
        </div>

        {/* Description */}
        <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Descrição da Atividade</label>
            <textarea 
                value={data.description} 
                onChange={e => handleChange('description', e.target.value.toUpperCase())}
                readOnly={readOnly}
                rows={2}
                className={`w-full p-3 rounded-xl border-2 text-xs font-bold text-gray-600 outline-none resize-none transition-all ${readOnly ? 'bg-gray-100 border-transparent' : 'bg-gray-50 border-gray-100 focus:bg-white focus:border-[#007e7a] focus:ring-4 focus:ring-[#007e7a]/10'}`}
                placeholder=""
            />
        </div>
      </div>

      {/* OM Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h4 className="font-black text-gray-700 uppercase flex items-center gap-2">
                        <Search size={18} /> Selecionar Ordem
                    </h4>
                    <button onClick={() => setIsPickerOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-white p-1 rounded-full shadow-sm">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-4 border-b border-gray-100">
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="FILTRAR..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-100 border-transparent p-3 rounded-xl text-xs font-bold uppercase focus:bg-white focus:border-[#007e7a] focus:ring-2 focus:ring-[#007e7a]/20 outline-none transition-all"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-gray-50/50">
                    {filteredOms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <Info size={32} className="mb-2 opacity-50"/>
                            <span className="text-xs font-bold uppercase">Nenhuma ordem encontrada</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredOms.map(om => (
                                <button 
                                    key={om.id} 
                                    onClick={() => selectOM(om)}
                                    className="w-full text-left bg-white p-4 rounded-xl border border-gray-100 hover:border-[#007e7a] hover:shadow-md transition-all group relative overflow-hidden"
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${om.type === 'CORRETIVA' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                    <div className="flex justify-between items-start mb-1 pl-2">
                                        <span className="font-black text-gray-800">{om.omNumber}</span>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${om.type === 'CORRETIVA' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{om.type}</span>
                                    </div>
                                    <div className="pl-2">
                                        <span className="text-xs font-bold text-[#007e7a] block mb-1">{om.tag}</span>
                                        <span className="text-[10px] text-gray-500 uppercase line-clamp-1">{om.description}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
