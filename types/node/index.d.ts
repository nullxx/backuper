
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'production' | 'development';
    PORT: string;
    LOG_LEVEL: string;
    API_SESSION_SECRET: string;
    RUN_JOBS: string;
  }
}