// smartquote_backend/index.ts
import cors from 'cors';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// --- SEKCJA MIDDLEWARE (To musi być pierwsze!) ---

// 1. Najpierw CORS
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
}));

// 2. Potem parsowanie JSON
app.use(express.json());

// --- SEKCJA ROUTINGU ---

app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    console.log(`Odebrano żądanie logowania dla: ${email}`);

    // Prosta weryfikacja "na sztywno" dla testów
    if (email === "test@smartquote.pl" && password === "secret") {
        return res.json({
            id: 'user_123',
            name: 'Weryfikator',
            email
        });
    } else {
        return res.status(401).json({ error: 'Błędny email lub hasło.' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`✅ Serwer backendu działa na porcie ${PORT}`);
});