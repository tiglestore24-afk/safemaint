
import { createClient } from '@supabase/supabase-js';

// Configurações do Banco de Dados SAFEMAINT
const SUPABASE_URL = 'https://vohwqgrkntuzccahlwye.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvaHdxZ3JrbnR1emNjYWhsd3llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzc1MDksImV4cCI6MjA4MTc1MzUwOX0.haPdoVGeE8FIIscY5IEhHSUJ9vHnRsxvDTK1mEsyUGA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) return { success: false, message: error.message };
        return { success: true, message: 'CONEXÃO ESTABELECIDA' };
    } catch (e) {
        return { success: false, message: 'ERRO DE REDE' };
    }
};
