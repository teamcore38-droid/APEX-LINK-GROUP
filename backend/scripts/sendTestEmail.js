import dotenv from 'dotenv';
import { getEmailConfigurationStatus, sendTestEmail } from '../utils/emailService.js';

dotenv.config();

const recipient = process.argv[2] || process.env.EMAIL_TEST_TO || process.env.EMAIL_FROM;
const status = getEmailConfigurationStatus();

if (!status.configured) {
  console.error('SMTP is not configured.');

  if (status.missing.length) {
    console.error(`Missing: ${status.missing.join(', ')}`);
  }

  if (status.invalid.length) {
    console.error(`Invalid: ${status.invalid.join('; ')}`);
  }

  process.exit(1);
}

if (!recipient) {
  console.error('Provide a recipient email: npm run email:test -- you@example.com');
  process.exit(1);
}

const result = await sendTestEmail(recipient);

if (!result.sent) {
  console.error(`SMTP test failed: ${result.error || 'email was not sent'}`);
  process.exit(1);
}

console.log(`SMTP test email sent to ${recipient} via ${status.host}:${status.port}.`);
