// smartquote_backend/index.ts

import express, { Request, Response } from 'express'; // <--- Dodaj typy Request i Response
import dotenv from 'dotenv';

dotenv.config();

// Poprawne typowanie aplikacji Express:
const app = express();

app.use(express.json());

// Użycie generycznych typów Request i Response:
app.post('/api/auth/login', (req: Request, res: Response) => {
    // TypeScript teraz wie, co to jest 'req' i 'res'
    const { email, password } = req.body;

    console.log(`Odebrano żądanie logowania dla: ${email}`);

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