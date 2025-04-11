/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string; // добавь это, если используешь VITE_API_URL
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  