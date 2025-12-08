import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '8080', 10),
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development',
    saltRounds: 12,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-min-32-characters-long',
    // Usuń jwtExpiresIn - będziemy używać bezpośrednio w kontrolerze


gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
},
};

export const isDev = config.nodeEnv === 'development';
export const isProd = config.nodeEnv === 'production';