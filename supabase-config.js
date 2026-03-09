// Supabase Configuration
// Replace these values with your actual Supabase project details
const SUPABASE_URL = 'https://ultmtnqbzckmyqffevjv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_R9_srXtrNCUeemY4PHiU4w_yP4S5cCJ';

// Initialize Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
export { supabase, SUPABASE_URL, SUPABASE_ANON_KEY };