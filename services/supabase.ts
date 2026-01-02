
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
// ID do Projeto: lmazcbbuzzjbdgolsbhz
export const SUPABASE_PROJECT_ID = 'lmazcbbuzzjbdgolsbhz';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtYXpjYmJ1enpqYmRnb2xzYmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjgxNjIsImV4cCI6MjA4Mjc0NDE2Mn0.5vJ7JwjbYDXEplOeUkdsw78filU_hYWXX5fOhocSv3Y';

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
        
        console.log('SAFEMAINT: Conectado com sucesso!');
        return true;
    } catch (e: any) {
        console.error('SAFEMAINT: Falha crítica na conexão:', e);
        return false;
    }
};
