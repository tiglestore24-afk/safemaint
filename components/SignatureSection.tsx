
import React, { useState, useEffect } from 'react';
import { SignaturePad } from './SignaturePad';
import { Employee, SignatureRecord } from '../types';
import { StorageService } from '../services/storage';
import { Trash2, PenTool, Plus, UserCheck, X } from 'lucide-react';

interface SignatureSectionProps {
  signatures: SignatureRecord[];
  onUpdate: (signatures: SignatureRecord[]) => void;
}

export const SignatureSection: React.FC<SignatureSectionProps> = ({ signatures, onUpdate }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSigning, setIsSigning] = useState(false);
  
  const [selectedPerson, setSelectedPerson] = useState('');
  const [selectedRole, setSelectedRole] = useState<'EXECUTANTE' | 'RESPONSAVEL'>('EXECUTANTE');

  useEffect(() => {
    setEmployees(StorageService.getEmployees());
  }, []);

  const handleSaveSignature = (dataUrl: string) => {
    if (!selectedPerson) {
      alert('⚠️ ERRO: Você deve selecionar um funcionário da lista antes de assinar.');
      return;
    }

    const emp = employees.find(e => e.id === selectedPerson);
    if (emp) {
      const now = new Date();
      const newSig: SignatureRecord = {
        id: crypto.randomUUID(),
        name: emp.name,
        matricula: emp.matricula,
        function: emp.function,
        role: selectedRole,
        signatureData: dataUrl,
        date: now.toISOString()
      };

      onUpdate([...signatures, newSig]);
      setIsSigning(false);
      setSelectedPerson('');
      setSelectedRole('EXECUTANTE');
    }
  };

  const handleDeleteSignature = (id: string) => {
      if(window.confirm("CONFIRMA A EXCLUSÃO DESTA ASSINATURA?")) {
          onUpdate(signatures.filter(s => s.id !== id));
      }
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
          <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><UserCheck size={20}/></div>
              <div>
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Equipe e Assinaturas</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Liberação técnica obrigatória</p>
              </div>
          </div>
          <button 
            onClick={() => setIsSigning(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-100 transition-all active:scale-95"
          >
              <Plus size={16} /> ADICIONAR MEMBRO
          </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {signatures.length === 0 ? (
              <div className="col-span-full py-10 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <PenTool size={32} className="mx-auto mb-2 text-gray-300 opacity-50" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhuma assinatura coletada ainda</span>
              </div>
          ) : (
              signatures.map((sig) => (
                <div key={sig.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative group hover:border-blue-200 transition-all">
                    <button onClick={() => handleDeleteSignature(sig.id)} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                    <div className="flex justify-between items-start mb-3">
                        <div className="bg-gray-100 px-2 py-0.5 rounded text-[8px] font-black text-gray-500 uppercase">{sig.matricula}</div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${sig.role === 'RESPONSAVEL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>{sig.role}</span>
                    </div>
                    <p className="text-[11px] font-black text-gray-800 uppercase leading-none mb-1 truncate">{sig.name}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-3">{sig.function}</p>
                    <div className="bg-gray-50 rounded-lg p-2 h-16 flex items-center justify-center border border-gray-100">
                        <img src={sig.signatureData} alt="Assinatura" className="max-h-full mix-blend-multiply" />
                    </div>
                </div>
              ))
          )}
      </div>

      {isSigning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border-t-8 border-blue-600">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-100"><PenTool size={20} /></div>
                        <div>
                            <h3 className="font-black text-sm text-gray-800 uppercase">Coletar Assinatura Digital</h3>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Selecione o nome antes de assinar</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSigning(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={24}/></button>
                </div>
                
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">1. Responsabilidade</label>
                        <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1">
                            <button className={`flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all ${selectedRole === 'EXECUTANTE' ? 'bg-white shadow-md text-gray-800' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setSelectedRole('EXECUTANTE')}>EXECUTANTE</button>
                            <button className={`flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all ${selectedRole === 'RESPONSAVEL' ? 'bg-blue-600 shadow-md text-white' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setSelectedRole('RESPONSAVEL')}>RESP. TÉCNICO</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">2. Identificar Membro</label>
                        <select 
                            className="w-full border-2 border-gray-100 p-4 rounded-2xl font-black text-xs text-gray-700 uppercase focus:border-blue-600 focus:bg-white outline-none transition-all appearance-none bg-gray-50 shadow-inner"
                            value={selectedPerson}
                            onChange={(e) => setSelectedPerson(e.target.value)}
                        >
                            <option value="">-- SELECIONE NA LISTA --</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.matricula} - {emp.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={selectedPerson ? 'animate-fadeIn' : 'opacity-30 pointer-events-none'}>
                        <SignaturePad 
                            label="3. Assinatura no Painel" 
                            onSave={handleSaveSignature}
                        />
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
