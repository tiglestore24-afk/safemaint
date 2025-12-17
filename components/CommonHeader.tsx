
import React, { useState } from 'react';
import { HeaderData, MaintenanceType } from '../types';

interface CommonHeaderProps {
  data: HeaderData;
  onChange: (data: HeaderData) => void;
  readOnly?: boolean;
}

export const CommonHeader: React.FC<CommonHeaderProps> = ({ data, onChange, readOnly = false }) => {
  const handleChange = (field: keyof HeaderData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 border-l-4 border-green-600">
      <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Cabeçalho de Manutenção</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">OM (Ordem de Manutenção)</label>
          <input
            type="text"
            value={data.om}
            onChange={(e) => handleChange('om', e.target.value)}
            disabled={readOnly}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 bg-gray-50 border p-2"
            placeholder=""
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">TAG / Equipamento</label>
          <input
            type="text"
            value={data.tag}
            onChange={(e) => handleChange('tag', e.target.value)}
            disabled={readOnly}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 bg-gray-50 border p-2"
            placeholder=""
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Data</label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => handleChange('date', e.target.value)}
            disabled={readOnly}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 bg-gray-50 border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Hora</label>
          <input
            type="time"
            value={data.time}
            onChange={(e) => handleChange('time', e.target.value)}
            disabled={readOnly}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 bg-gray-50 border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo de Manutenção</label>
          <select
            value={data.type}
            onChange={(e) => handleChange('type', e.target.value as MaintenanceType)}
            disabled={readOnly}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 bg-gray-50 border p-2"
          >
            <option value="MECANICA">Mecânica</option>
            <option value="ELETRICA">Elétrica</option>
            <option value="LUBRIFICACAO">Lubrificação</option>
            <option value="SOLDA">Solda</option>
            <option value="OUTROS">Outros</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700">Manutenção a ser Feita / Descrição</label>
          <input
            type="text"
            value={data.description}
            onChange={(e) => handleChange('description', e.target.value)}
            disabled={readOnly}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 bg-gray-50 border p-2"
            placeholder=""
          />
        </div>
      </div>
    </div>
  );
};
