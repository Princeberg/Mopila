import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://cmqdsrcxzjaqjmbnrgmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtcWRzcmN4emphcWptYm5yZ210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTMyODksImV4cCI6MjA2OTA2OTI4OX0.W_Sl2DDxci0db9fZdObe1g8M6afB8wFco2mNKtZkghU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
