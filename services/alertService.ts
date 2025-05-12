import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { WebClient } from '@slack/web-api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AlertConfig {
  id: string;
  type: 'email' | 'sms' | 'slack';
  recipient: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AlertPayload {
  caseId: string;
  severity: string;
  patientName: string;
  department: string;
  symptoms: string[];
  waitTime: number;
  timestamp: string;
}

class AlertService {
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: twilio.Twilio;
  private slackClient: WebClient;

  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Initialize Twilio client
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Initialize Slack client
    this.slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  async sendCriticalAlert(payload: AlertPayload): Promise<void> {
    try {
      // Get all active alert configurations
      const { data: alertConfigs, error } = await supabase
        .from('alert_configs')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching alert configurations:', error);
        return;
      }

      // Send alerts through all configured channels
      await Promise.all(
        alertConfigs.map(async (config: AlertConfig) => {
          try {
            switch (config.type) {
              case 'email':
                await this.sendEmailAlert(config, payload);
                break;
              case 'sms':
                await this.sendSMSAlert(config, payload);
                break;
              case 'slack':
                await this.sendSlackAlert(config, payload);
                break;
            }
          } catch (error) {
            console.error(`Error sending ${config.type} alert:`, error);
          }
        })
      );

      // Log the alert
      await this.logAlert(payload);
    } catch (error) {
      console.error('Error in sendCriticalAlert:', error);
    }
  }

  private async sendEmailAlert(config: AlertConfig, payload: AlertPayload): Promise<void> {
    const subject = `🚨 Critical Triage Alert: ${payload.patientName}`;
    const html = this.generateEmailTemplate(payload);

    await this.emailTransporter.sendMail({
      from: process.env.SMTP_FROM,
      to: config.recipient,
      subject,
      html,
    });
  }

  private async sendSMSAlert(config: AlertConfig, payload: AlertPayload): Promise<void> {
    const message = this.generateSMSTemplate(payload);

    await this.twilioClient.messages.create({
      body: message,
      to: config.recipient,
      from: process.env.TWILIO_PHONE_NUMBER,
    });
  }

  private async sendSlackAlert(config: AlertConfig, payload: AlertPayload): Promise<void> {
    const blocks = this.generateSlackBlocks(payload);

    await this.slackClient.chat.postMessage({
      channel: config.recipient,
      blocks,
    });
  }

  private async logAlert(payload: AlertPayload): Promise<void> {
    await supabase.from('alert_logs').insert({
      case_id: payload.caseId,
      severity: payload.severity,
      patient_name: payload.patientName,
      department: payload.department,
      symptoms: payload.symptoms,
      wait_time: payload.waitTime,
      timestamp: payload.timestamp,
    });
  }

  private generateEmailTemplate(payload: AlertPayload): string {
    return `
      <h2>🚨 Critical Triage Alert</h2>
      <p><strong>Patient:</strong> ${payload.patientName}</p>
      <p><strong>Department:</strong> ${payload.department}</p>
      <p><strong>Severity:</strong> ${payload.severity}</p>
      <p><strong>Symptoms:</strong> ${payload.symptoms.join(', ')}</p>
      <p><strong>Wait Time:</strong> ${payload.waitTime} minutes</p>
      <p><strong>Time:</strong> ${new Date(payload.timestamp).toLocaleString()}</p>
      <p>Please review this case immediately.</p>
    `;
  }

  private generateSMSTemplate(payload: AlertPayload): string {
    return `🚨 Critical Triage Alert: ${payload.patientName} in ${payload.department}. Severity: ${payload.severity}. Wait time: ${payload.waitTime}min. Please review immediately.`;
  }

  private generateSlackBlocks(payload: AlertPayload): any[] {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Critical Triage Alert',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Patient:*\n${payload.patientName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Department:*\n${payload.department}`,
          },
        ],
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${payload.severity}`,
          },
          {
            type: 'mrkdwn',
            text: `*Wait Time:*\n${payload.waitTime} minutes`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Symptoms:*\n${payload.symptoms.join(', ')}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Alert sent at ${new Date(payload.timestamp).toLocaleString()}`,
          },
        ],
      },
    ];
  }
}

export const alertService = new AlertService(); 