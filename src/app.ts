import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, isDev } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { errorResponse } from './utils/apiResponse';

const app = express();


app.use(helmet());


app.use(
    cors({
        origin: config.clientUrl,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


if (isDev) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}


app.use('/api', routes);


app.use((req, res) => {
    errorResponse(res, 'NOT_FOUND', `Endpoint ${req.method} ${req.path} nie istnieje`, 404);
});


app.use(errorHandler);

export default app;