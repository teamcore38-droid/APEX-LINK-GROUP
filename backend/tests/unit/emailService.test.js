import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getEmailConfigurationStatus,
  isEmailConfigured,
  sendTestEmail,
} from '../../utils/emailService.js';

const EMAIL_ENV_KEYS = [
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM',
  'EMAIL_REPLY_TO',
  'EMAIL_TEST_TO',
  'EMAIL_SEND_MAX_ATTEMPTS',
  'EMAIL_RETRY_DELAY_MS',
];

const withEmailEnv = async (values, callback) => {
  const previous = Object.fromEntries(EMAIL_ENV_KEYS.map((key) => [key, process.env[key]]));

  try {
    EMAIL_ENV_KEYS.forEach((key) => {
      delete process.env[key];
    });

    Object.entries(values).forEach(([key, value]) => {
      process.env[key] = value;
    });

    await callback();
  } finally {
    EMAIL_ENV_KEYS.forEach((key) => {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    });
  }
};

test('email configuration reports missing required SMTP variables', async () => {
  await withEmailEnv({}, async () => {
    const status = getEmailConfigurationStatus();

    assert.equal(isEmailConfigured(), false);
    assert.equal(status.configured, false);
    assert.deepEqual(status.missing.sort(), [
      'EMAIL_FROM',
      'EMAIL_HOST',
      'EMAIL_PASS',
      'EMAIL_PORT',
      'EMAIL_USER',
    ]);
  });
});

test('email configuration accepts Brevo STARTTLS settings', async () => {
  await withEmailEnv(
    {
      EMAIL_HOST: 'smtp-relay.brevo.com',
      EMAIL_PORT: '587',
      EMAIL_USER: 'brevo-login',
      EMAIL_PASS: 'brevo-smtp-key',
      EMAIL_FROM: 'Apex Fashion <orders@apexfashion.lk>',
    },
    async () => {
      const status = getEmailConfigurationStatus();

      assert.equal(status.configured, true);
      assert.equal(status.host, 'smtp-relay.brevo.com');
      assert.equal(status.port, 587);
      assert.equal(status.secure, false);
      assert.deepEqual(status.missing, []);
      assert.deepEqual(status.invalid, []);
    }
  );
});

test('email configuration marks SSL SMTP port as secure', async () => {
  await withEmailEnv(
    {
      EMAIL_HOST: 'smtp-relay.brevo.com',
      EMAIL_PORT: '465',
      EMAIL_USER: 'brevo-login',
      EMAIL_PASS: 'brevo-smtp-key',
      EMAIL_FROM: 'Apex Fashion <orders@apexfashion.lk>',
    },
    async () => {
      const status = getEmailConfigurationStatus();

      assert.equal(status.configured, true);
      assert.equal(status.port, 465);
      assert.equal(status.secure, true);
    }
  );
});

test('sendTestEmail skips safely when SMTP is not configured', async () => {
  await withEmailEnv({}, async () => {
    const originalLog = console.log;

    console.log = () => {};

    try {
      const result = await sendTestEmail('customer@example.com');

      assert.equal(result.sent, false);
      assert.equal(result.skipped, true);
    } finally {
      console.log = originalLog;
    }
  });
});
