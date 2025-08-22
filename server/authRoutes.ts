import type { Express, Request, Response } from 'express';
import { authHandler } from './auth';
import twilio from 'twilio';

export function mountAuthRoutes(app: Express) {
	app.all('/api/auth/*', async (req: Request, res: Response) => {
		return authHandler(req as any, res as any);
	});

	app.post('/api/auth/sms/request', async (req: Request, res: Response) => {
		const { phone } = req.body as { phone?: string };
		if (!phone) return res.status(400).json({ message: 'Phone is required' });
		const code = (Math.floor(100000 + Math.random() * 900000)).toString();
		// Store the code (for demo use ephemeral env or memory)
		(process as any).latestSmsCode = code;
		if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
			try {
				const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
				await client.messages.create({
					from: process.env.TWILIO_FROM_NUMBER,
					to: phone,
					body: `Your Shist code: ${code}`,
				});
			} catch (e) {
				console.warn('Twilio send error', e);
			}
		}
		// For local testing
		if (process.env.NODE_ENV !== 'production') {
			console.log('SMS test code:', code);
		}
		res.json({ ok: true });
	});
}