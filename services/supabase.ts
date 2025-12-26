import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ekyfihmbvwuospxqydzu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_St4yqf5K6bRVG-5tRlTZrA_ke47rY_j';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper para verificar conexão
export const checkConnection = async () => {
    try {
        const { count, error } = await supabase.from('oms').select('*', { count: 'exact', head: true });
        if (error) throw error;
        console.log('Supabase Connected! Count OMs:', count);
        return true;
    } catch (e) {
        console.error('Supabase Connection Failed:', e);
        return false;
    }
};