import React, { useState, useEffect } from 'react';
import { SignaturePad } from './SignaturePad';
import { Employee, SignatureRecord } from '../types';
import { StorageService } from '../services/storage';
import { Trash2, PenTool, Plus } from 'lucide-react';

interface SignatureSectionProps {
  signatures: SignatureRecord[];
  onUpdate: (signatures: SignatureRecord[]) => void;
}

export const SignatureSection: React.FC<SignatureSectionProps> = ({ signatures, onUpdate }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSigning, setIsSigning] = useState(false);
  
  // Temporary State for the Modal
  const [selectedPerson, setSelectedPerson] = useState('');
  const [selectedRole, setSelectedRole] = useState<'EXECUTANTE' | 'RESPONSAVEL'>('EXECUTANTE');

  useEffect(() => {
    setEmployees(StorageService.getEmployees());
  }, []);

  const handleSaveSignature = (dataUrl: string) => {
    if (!selectedPerson) {
      alert('Selecione o funcionário.');
      return;
    }

    const emp = employees.find(e => e.id === selectedPerson);
    if (emp) {
      const now = new Date();
      
      // If adding a Responsavel, remove previous responsavel if exists (usually only 1 leader)
      let currentSignatures = [...signatures];
      if (selectedRole === 'RESPONSAVEL') {
          // Optional: decide if multiple leaders are allowed. For now, let's just append.
          // If you want single leader: currentSignatures = currentSignatures.filter(s => s.role !== 'RESPONSAVEL');
      }

      const newSig: SignatureRecord = {
        id: crypto.randomUUID(),
        name: emp.name,
        matricula: emp.matricula,
        function: emp.function,
        role: selectedRole,
        signatureData: dataUrl,
        date: now.toISOString()
      };

      onUpdate([...currentSignatures, newSig]);
      
      // Close Modal & Reset
      setIsSigning(false);
      setSelectedPerson('');
      setSelectedRole('EXECUTANTE');
    }
  };

  const handleDeleteSignature = (id: string) => {
      if(window.confirm("Deseja excluir esta assinatura?")) {
          const updated = signatures.filter(s => s.id !== id);
          onUpdate(updated);
      }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h3 className="text-lg font-bold text-gray-800 border-l-4 border-yellow-500 pl-3">
              Assinaturas e Liberação
          </h3>
          <button 
            onClick={() => setIsSigning(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition-transform active:scale-95"
          >
              <Plus size={18} />
              NOVA ASSINATURA
          </button>
      </div>
      
      {/* Signature Table - List View */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Matrícula</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Função</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Assinatura</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data/Hora</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Ação</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {signatures.length === 0 && (
                      <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                              <div className="flex flex-col items-center gap-2">
                                  <PenTool size={24} className="opacity-20" />
                                  <span>Nenhuma assinatura registrada. Clique em "Nova Assinatura".</span>
                              </div>
                          </td>
                      </tr>
                  )}
                  {signatures.map((sig) => {
                      const dateObj = new Date(sig.date);
                      return (
                        <tr key={sig.id} className="hover:bg-blue-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900 font-mono">{sig.matricula}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-bold">{sig.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{sig.function}</td>
                            <td className="px-4 py-3 text-center">
                                <img src={sig.signatureData} alt="Assinatura" className="h-10 mx-auto bg-white" />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                                {dateObj.toLocaleDateString()} <span className="text-gray-400">|</span> {dateObj.toLocaleTimeString().slice(0,5)}
                            </td>
                            <td className="px-4 py-3 text-xs">
                                <span className={`px-2 py-1 rounded-full font-bold border ${sig.role === 'RESPONSAVEL' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                    {sig.role}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <button 
                                    onClick={() => handleDeleteSignature(sig.id)}
                                    className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                    title="Excluir Assinatura"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                      );
                  })}
              </tbody>
          </table>
      </div>

      {/* Signature Modal Overlay */}
      {isSigning && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-gray-100 px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <PenTool size={18} />
                        Coletar Assinatura
                    </h3>
                    <button onClick={() => setIsSigning(false)} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Assinatura</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${selectedRole === 'EXECUTANTE' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setSelectedRole('EXECUTANTE')}
                            >
                                EXECUTANTE
                            </button>
                            <button 
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${selectedRole === 'RESPONSAVEL' ? 'bg-blue-600 shadow text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setSelectedRole('RESPONSAVEL')}
                            >
                                RESPONSÁVEL TÉCNICO
                            </button>
                        </div>
                    </div>

                    {/* Person Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Funcionário</label>
                        <select 
                            className="w-full border-gray-300 border p-3 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                            value={selectedPerson}
                            onChange={(e) => setSelectedPerson(e.target.value)}
                        >
                            <option value="">Selecione na lista...</option>
                            {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.matricula} - {emp.name} ({emp.function})</option>
                            ))}
                        </select>
                    </div>

                    {/* Pad */}
                    <div className="mt-4">
                        <SignaturePad 
                            label="Rubrica / Assinatura Digital" 
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
