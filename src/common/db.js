// src/common/db.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://sjrvigfoztllubjpwnoz.supabase.co';
const SUPABASE_KEY = 'sb_publishable__45yxFL18jgN7gUy2YQzIA_Wl2i9-gz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);