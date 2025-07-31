// Contenido COMPLETO para: src/config.ts

interface GoogleConfig {
  API_KEY: string;
  CLIENT_ID: string;
  SECRET: string;
}

interface FacebookConfig {
  APP_ID: string;
}

interface ApiConfig {
  API_URL: string | undefined;
}

interface Config {
  google: GoogleConfig;
  facebook: FacebookConfig;
  api: ApiConfig;
}

const config: Config = {
  google: {
    API_KEY: "",
    CLIENT_ID: "",
    SECRET: "",
  },
  facebook: {
    APP_ID: "",
  },
  api: {
    API_URL: process.env.REACT_APP_API_URL, // <-- ¡EL CAMBIO CLAVE!
  },
};

export default config;