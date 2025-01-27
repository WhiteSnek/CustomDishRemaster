import express, { NextFunction, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3000;

const proxyRoutes = [
    { path: '/api/v1/customers', target: process.env.USERS_SERVICE_URL || 'http://localhost:3001' },
    { path: '/api/v1/restaurants', target: process.env.ORDER_SERVICE_URL || 'http://localhost:3002' },
    { path: '/api/v1/inventory', target: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003' },
    { path: '/api/v1/cart', target: process.env.CART_SERVICE_URL || 'http://localhost:3004' },
];

// Security Middleware
app.use(helmet());
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
});
app.use(limiter);

// Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[Proxy server]: ${req.method} ${req.url}`);
    next();
});

// Proxy Routes
proxyRoutes.forEach(({ path, target }) => {
    app.use(
        path,
        createProxyMiddleware({
            target,
            changeOrigin: true
        })
    );
});

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ message: 'Proxy server is running!' });
});

// Start the Server
app.listen(PORT, () => {
    console.log(`[Proxy Server] Running on http://localhost:${PORT}`);
});
