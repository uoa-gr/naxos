// Supabase Configuration for Naxos Geomorphological WebGIS
// Copy to config.js and replace with actual credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
window.DEBUG_MODE = false;

(function initializeSupabase() {
    if (typeof supabase === 'undefined') {
        console.warn('Supabase library not loaded. Using local data fallback.');
        return;
    }
    if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        console.warn('Supabase not configured. Using local data fallback.');
        return;
    }
    try {
        const { createClient } = supabase;
        window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized');
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
    }
})();
