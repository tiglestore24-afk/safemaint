
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
// ID do Projeto: lmazcbbuzzjbdgolsbhz
export const SUPABASE_PROJECT_ID = 'lmazcbbuzzjbdgolsbhz';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
// NOTA: A chave fornecida foi inserida diretamente. Se houver erro de conexão, 
// verifique se copiou a 'anon' public key correta (geralmente começa com 'eyJ...') no painel do Supabase.
const SUPABASE_KEY = 'sb_publishable_vAgjUesV71WRr6rQxZrSJg_pUb9ETKK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});

// Helper para verificar conexão e diagnosticar problemas
export const checkConnection = async () => {
    try {
        console.log('SAFEMAINT: Tentando conectar ao Supabase...');
        
        // Tenta buscar o cabeçalho da tabela de usuários para validar a conexão e permissões
        const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
        
        if (error) {
            console.error('SAFEMAINT: Erro de conexão Supabase:', error.message, error.details);
            return false;
        }
        
        console.log('SAFEMAINT: Conectado com sucesso! (Tabela Users acessível)');
        return true;
    } catch (e: any) {
        const errorMsg = e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
        console.error('SAFEMAINT: Falha crítica na conexão:', errorMsg);
        return false;
    }
};
