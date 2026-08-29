import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

export const config = {
  port: process.env.PORT || 3001,
  clientUrl: process.env.CLIENT_URL || '',
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY
  }
};
