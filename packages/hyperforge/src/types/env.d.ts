/**
 * Environment variable type declarations for HyperForge.
 * These declarations provide proper typing for all environment variables
 * to satisfy noPropertyAccessFromIndexSignature.
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Node environment
      NODE_ENV: 'development' | 'production' | 'test';
      
      // CDN and URLs
      NEXT_PUBLIC_CDN_URL?: string;
      CDN_URL?: string;
      NEXT_PUBLIC_API_URL?: string;
      HYPERSCAPE_SERVER_URL?: string;
      
      // Asset directories
      HYPERFORGE_ASSETS_DIR?: string;
      
      // AI Services
      OPENAI_API_KEY?: string;
      ANTHROPIC_API_KEY?: string;
      MESHY_API_KEY?: string;
      FAL_KEY?: string;
      
      // ElevenLabs
      ELEVENLABS_API_KEY?: string;
      
      // Supabase
      NEXT_PUBLIC_SUPABASE_URL?: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
      SUPABASE_SERVICE_ROLE_KEY?: string;
      
      // Database
      DATABASE_URL?: string;
      
      // AI Gateway
      AI_GATEWAY_URL?: string;
      AI_GATEWAY_API_KEY?: string;
      
      // Testing
      CI?: string;
      PLAYWRIGHT_BASE_URL?: string;
      TEST_API_URL?: string;
      NEXT_DEV_SERVER?: string;
      
      // Feature flags
      ENABLE_CDN_FALLBACK?: string;
      
      // Server
      PORT?: string;
    }
  }
}

export {};
