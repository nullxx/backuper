
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'production' | 'development';
    PORT: string;
    LOG_LEVEL: string;
    API_SESSION_SECRET: string;
    RUN_JOBS: string;
    ENCRYPT_SALT_ROUNDS: string;
    DB_ENCRYPT_ATTR_KEY: string
    DB_ENCRYPT_ATTR_IV: string;
  }
}