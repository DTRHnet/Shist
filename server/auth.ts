import { Auth } from '@auth/core';
import type { NextFunction, Request, Response } from 'express';
import EmailProvider from '@auth/core/providers/email';
import Credentials from '@auth/core/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './prisma';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export const authHandler = Auth({
	adapter: PrismaAdapter(prisma) as any,
	providers: [
		EmailProvider({
			server: {
				send: async (options) => {
					await resend.emails.send({
						to: options.to,
						from: process.env.RESEND_FROM || 'Shist <noreply@shist.dev>',
						subject: options.subject || 'Sign in to Shist',
						html: options.html || '',
						text: options.text || ''
					});
				},
			},
			from: process.env.RESEND_FROM || 'Shist <noreply@shist.dev>',
		}),
		Credentials({
			name: 'SMS OTP',
			credentials: {
				phone: { label: 'Phone', type: 'text' },
				code: { label: 'Code', type: 'text' }
			},
			authorize: async (credentials) => {
				const phone = (credentials?.phone || '').trim();
				const code = (credentials?.code || '').trim();
				if (!phone || !code) return null;
				// Verify code via in-memory or Redis store (placeholder)
				if (process.env.SMS_TEST_CODE && code === process.env.SMS_TEST_CODE) {
					const user = await prisma.user.upsert({
						where: { email: phone },
						update: {},
						create: { email: phone, firstName: 'SMS', lastName: 'User' }
					});
					return { id: user.id, email: user.email || undefined, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() } as any;
				}
				return null;
			}
		})
	],
	session: { strategy: 'jwt' },
	jwt: {
		encode: async ({ token, secret }) => jwt.sign(token as any, secret, { algorithm: 'HS256' }),
		decode: async ({ token, secret }) => (token ? (jwt.verify(token, secret) as any) : null),
	},
	cookies: {
		sessionToken: {
			name: process.env.AUTH_COOKIE_NAME || 'shist.session',
			options: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' }
		}
	},
	secret: process.env.AUTH_SECRET,
});

export function getServerAuth(req: Request, res: Response) {
	return authHandler(req as any, res as any);
}

export async function requireUser(req: Request, res: Response, next: NextFunction) {
	try {
		const session = await (authHandler as any)(req, res);
		if (!session?.user) return res.status(401).json({ message: 'Unauthorized' });
		(req as any).auth = session;
		next();
	} catch (e) {
		return res.status(401).json({ message: 'Unauthorized' });
	}
}

export async function requireListAccess(listId: string, role: 'VIEWER' | 'EDITOR' | 'OWNER', userId: string) {
	// Simple role mapping on existing participants
	const membership = await prisma.listMember.findUnique({ where: { listId_userId: { listId, userId } } }).catch(() => null);
	if (!membership) throw new Error('FORBIDDEN');
	if (role === 'VIEWER') return;
	if (role === 'EDITOR' && (membership.canEdit || membership.canDelete)) return;
	if (role === 'OWNER' && membership.role === 'OWNER') return;
	throw new Error('FORBIDDEN');
}