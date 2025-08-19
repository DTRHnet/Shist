// Email and SMS invitation service for Shist
// Integrates with email/SMS providers for sending invitations
import { nanoid } from 'nanoid';
import type { Invitation, InsertInvitation, User, List } from "@shared/schema";

// Email service interface (can be implemented with SendGrid, Nodemailer, etc.)
export interface EmailService {
  sendInvitationEmail(
    recipientEmail: string,
    inviterName: string,
    invitationLink: string,
    invitationType: 'connection' | 'list',
    listName?: string
  ): Promise<void>;
}

// SMS service interface (can be implemented with Twilio, etc.)
export interface SMSService {
  sendInvitationSMS(
    recipientPhone: string,
    inviterName: string,
    invitationLink: string,
    invitationType: 'connection' | 'list',
    listName?: string
  ): Promise<void>;
}

// Mock implementations for development
export class MockEmailService implements EmailService {
  async sendInvitationEmail(
    recipientEmail: string,
    inviterName: string,
    invitationLink: string,
    invitationType: 'connection' | 'list',
    listName?: string
  ): Promise<void> {
    console.log(`📧 Mock Email Sent to: ${recipientEmail}`);
    console.log(`   From: ${inviterName}`);
    console.log(`   Type: ${invitationType} invitation`);
    if (listName) console.log(`   List: ${listName}`);
    console.log(`   Link: ${invitationLink}`);
    console.log('   Subject: You\'re invited to join Shist!');
    
    // Simulate async email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export class MockSMSService implements SMSService {
  async sendInvitationSMS(
    recipientPhone: string,
    inviterName: string,
    invitationLink: string,
    invitationType: 'connection' | 'list',
    listName?: string
  ): Promise<void> {
    console.log(`📱 Mock SMS Sent to: ${recipientPhone}`);
    console.log(`   From: ${inviterName}`);
    console.log(`   Type: ${invitationType} invitation`);
    if (listName) console.log(`   List: ${listName}`);
    console.log(`   Link: ${invitationLink}`);
    console.log('   Message: You\'re invited to join Shist! Click to accept.');
    
    // Simulate async SMS sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Real email service using environment-configured provider
export class EmailInvitationService implements EmailService {
  async sendInvitationEmail(
    recipientEmail: string,
    inviterName: string,
    invitationLink: string,
    invitationType: 'connection' | 'list',
    listName?: string
  ): Promise<void> {
    const subject = invitationType === 'list' 
      ? `${inviterName} invited you to collaborate on "${listName}"`
      : `${inviterName} wants to connect with you on Shist`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎯 Shist Invitation</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">You're Invited!</h2>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            <strong>${inviterName}</strong> has invited you to 
            ${invitationType === 'list' ? `collaborate on the list "<strong>${listName}</strong>"` : 'connect'} 
            on Shist - the collaborative list app that keeps you organized together.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" style="
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: bold;
              display: inline-block;
              transition: transform 0.2s;
            ">Accept Invitation</a>
          </div>
          
          <p style="font-size: 14px; color: #777; line-height: 1.6;">
            With Shist, you can create shared lists, collaborate in real-time, and stay organized together. 
            ${invitationType === 'list' ? 'Join this list to start adding and checking off items with your collaborators!' : 'Connect to start sharing lists and staying organized together!'}
          </p>
          
          <hr style="border: none; height: 1px; background: #eee; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;

    // In production, implement with your chosen email service
    // For now, use mock service
    console.log('📧 Would send email:', { recipientEmail, subject, htmlContent });
  }
}

// Real SMS service using environment-configured provider
export class SMSInvitationService implements SMSService {
  async sendInvitationSMS(
    recipientPhone: string,
    inviterName: string,
    invitationLink: string,
    invitationType: 'connection' | 'list',
    listName?: string
  ): Promise<void> {
    const message = invitationType === 'list'
      ? `🎯 ${inviterName} invited you to collaborate on "${listName}" in Shist! Accept: ${invitationLink}`
      : `🎯 ${inviterName} wants to connect with you on Shist! Accept: ${invitationLink}`;

    // In production, implement with your chosen SMS service (Twilio, etc.)
    // For now, use mock service
    console.log('📱 Would send SMS:', { recipientPhone, message });
  }
}

// Invitation utility functions
export class InvitationUtils {
  static generateInvitationToken(): string {
    return nanoid(32); // 32-character URL-safe token
  }

  static generateInvitationLink(token: string, baseUrl: string): string {
    return `${baseUrl}/invite/${token}`;
  }

  static getExpirationDate(days: number = 7): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPhoneNumber(phone: string): boolean {
    // Basic phone validation - supports various formats
    const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    return phone.replace(/[^\d+]/g, '');
  }
}

// Service factory
export function createInvitationServices() {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.LOCAL_DEV === 'true';
  
  return {
    emailService: isDevelopment ? new MockEmailService() : new EmailInvitationService(),
    smsService: isDevelopment ? new MockSMSService() : new SMSInvitationService(),
  };
}