import nodemailer from 'nodemailer';

/*
  Production email delivery expects these environment variables:
  - EMAIL_HOST
  - EMAIL_PORT
  - EMAIL_USER
  - EMAIL_PASS
  - EMAIL_FROM
  - FRONTEND_URL
  Optional:
  - EMAIL_REPLY_TO
  - EMAIL_SEND_MAX_ATTEMPTS
  - EMAIL_RETRY_DELAY_MS

  Development can run safely without them. In that case the service falls back
  to a no-op logger and the app flow continues without crashing.
*/

let transporter = null;

const REQUIRED_EMAIL_ENV_VARS = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
const TRANSIENT_SMTP_RESPONSE_CODES = new Set([421, 450, 451, 452, 454]);
const RETRYABLE_NETWORK_ERROR_CODES = new Set([
  'EAI_AGAIN',
  'ECONNECTION',
  'ECONNRESET',
  'ESOCKET',
  'ETIMEDOUT',
]);

let emailConfigurationWarningLogged = false;

const trimEnv = (value) => String(value || '').trim();

const parsePositiveInteger = (value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Number.parseInt(trimEnv(value), 10);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
};

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const getEmailConfiguration = () => {
  const host = trimEnv(process.env.EMAIL_HOST);
  const rawPort = trimEnv(process.env.EMAIL_PORT);
  const port = Number.parseInt(rawPort, 10);
  const user = trimEnv(process.env.EMAIL_USER);
  const pass = trimEnv(process.env.EMAIL_PASS);
  const from = trimEnv(process.env.EMAIL_FROM);
  const replyTo = trimEnv(process.env.EMAIL_REPLY_TO);

  const missing = REQUIRED_EMAIL_ENV_VARS.filter((key) => !trimEnv(process.env[key]));
  const invalid = [];

  if (rawPort && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    invalid.push('EMAIL_PORT must be a number between 1 and 65535');
  }

  return {
    configured: missing.length === 0 && invalid.length === 0,
    host,
    port,
    user,
    pass,
    from,
    replyTo,
    secure: port === 465,
    missing,
    invalid,
  };
};

const getEmailConfigurationStatus = () => {
  const { configured, host, port, from, replyTo, secure, missing, invalid } = getEmailConfiguration();

  return {
    configured,
    host,
    port,
    from,
    replyTo,
    secure,
    missing,
    invalid,
  };
};

const isEmailConfigured = () => getEmailConfiguration().configured;

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

const getEmailRetryOptions = () => ({
  maxAttempts: parsePositiveInteger(process.env.EMAIL_SEND_MAX_ATTEMPTS, 3, { min: 1, max: 5 }),
  retryDelayMs: parsePositiveInteger(process.env.EMAIL_RETRY_DELAY_MS, 750, { min: 100, max: 10000 }),
});

const getRetryDelay = (attempt, retryDelayMs) =>
  retryDelayMs * 2 ** Math.max(attempt - 1, 0);

const shouldRetryEmailError = (error) => {
  if (error?.command === 'AUTH' || error?.code === 'EAUTH') {
    return false;
  }

  const responseCode = Number(error?.responseCode);

  if (Number.isInteger(responseCode)) {
    return TRANSIENT_SMTP_RESPONSE_CODES.has(responseCode);
  }

  if (error?.code) {
    return RETRYABLE_NETWORK_ERROR_CODES.has(error.code);
  }

  return true;
};

const maskEmailAddress = (value = '') => {
  const email = trimEnv(value);
  const atIndex = email.indexOf('@');

  if (atIndex <= 1) {
    return email ? '[redacted-email]' : '';
  }

  return `${email[0]}***${email.slice(atIndex)}`;
};

const sanitizeEmailErrorMessage = (message = '') => {
  const emailConfig = getEmailConfiguration();

  return [emailConfig.user, emailConfig.pass]
    .filter(Boolean)
    .reduce(
      (safeMessage, secret) => safeMessage.split(secret).join('[redacted]'),
      trimEnv(message)
    );
};

const getEmailErrorLogContext = ({ label, to, attempt, maxAttempts, error }) => ({
  label,
  to: maskEmailAddress(to),
  attempt,
  maxAttempts,
  code: error?.code,
  responseCode: error?.responseCode,
  command: error?.command,
  message: sanitizeEmailErrorMessage(error?.message || error),
});

const logEmailConfigurationProblem = (label, emailConfig) => {
  if (process.env.NODE_ENV !== 'production' || emailConfigurationWarningLogged) {
    return;
  }

  emailConfigurationWarningLogged = true;
  console.warn('[emailService:configuration]', {
    label,
    configured: false,
    missing: emailConfig.missing,
    invalid: emailConfig.invalid,
  });
};

const getTransporter = () => {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!transporter) {
    const emailConfig = getEmailConfiguration();

    transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      requireTLS: emailConfig.port === 587,
      tls: {
        minVersion: 'TLSv1.2',
      },
    });
  }

  return transporter;
};

const logInDevelopment = (label, payload) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[emailService:${label}]`, payload);
  }

  return {
    sent: false,
    queued: false,
    skipped: true,
  };
};

const sendMailSafe = async ({ label, to, subject, html, developmentPayload = {} }) => {
  if (!to) {
    return logInDevelopment(`${label}:missing-recipient`, developmentPayload);
  }

  const emailConfig = getEmailConfiguration();

  if (!emailConfig.configured) {
    logEmailConfigurationProblem(label, emailConfig);

    return logInDevelopment(label, {
      to,
      subject,
      ...developmentPayload,
    });
  }

  const { maxAttempts, retryDelayMs } = getEmailRetryOptions();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const activeTransporter = getTransporter();

      await activeTransporter.sendMail({
        from: emailConfig.from,
        to,
        subject,
        html,
        ...(emailConfig.replyTo ? { replyTo: emailConfig.replyTo } : {}),
      });

      if (attempt > 1) {
        console.info('[emailService:retry-success]', {
          label,
          to: maskEmailAddress(to),
          attempt,
        });
      }

      return {
        sent: true,
        queued: false,
        skipped: false,
        attempts: attempt,
      };
    } catch (error) {
      const retry = attempt < maxAttempts && shouldRetryEmailError(error);
      const logContext = getEmailErrorLogContext({ label, to, attempt, maxAttempts, error });

      if (retry) {
        console.warn('[emailService:retry]', logContext);
        transporter = null;
        await sleep(getRetryDelay(attempt, retryDelayMs));
        continue;
      }

      console.error(`[emailService:${label}]`, logContext);

      return {
        sent: false,
        queued: false,
        skipped: false,
        attempts: attempt,
        error: sanitizeEmailErrorMessage(error?.message || error),
      };
    }
  }

  return {
    sent: false,
    queued: false,
    skipped: false,
    attempts: maxAttempts,
    error: 'Email send failed after retry attempts',
  };
};

const wrapTemplate = ({ title, preheader, body }) => `
  <div style="margin:0;padding:24px;background:#f2f5fa;font-family:Arial,sans-serif;color:#0b1f3a;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dce4ef;">
      <div style="padding:32px 32px 24px;background:linear-gradient(135deg,#081729,#16365f,#c9a227);color:#ffffff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#ead9a0;">Apex Link Group</div>
        <h1 style="margin:16px 0 8px;font-family:Georgia,serif;font-size:32px;line-height:1.2;">${title}</h1>
        <p style="margin:0;font-size:14px;line-height:1.8;color:rgba(255,255,255,0.82);">${preheader}</p>
      </div>
      <div style="padding:32px;">${body}</div>
    </div>
  </div>
`;

const summaryRow = (label, value) => `
  <tr>
    <td style="padding:10px 0;color:#6b7a92;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;">${label}</td>
    <td style="padding:10px 0;text-align:right;font-size:15px;font-weight:700;color:#0b1f3a;">${value}</td>
  </tr>
`;

const buildOrderUrl = (orderId) => `${getFrontendUrl()}/orders/${orderId}`;
const buildInvoiceUrl = (orderId) => `${getFrontendUrl()}/orders/${orderId}/invoice`;
const buildTrackUrl = () => `${getFrontendUrl()}/track-order`;

const getSafeOrderRecipient = (order) => order?.shippingAddress?.email || order?.user?.email || '';

const getPaymentLabel = (order) => order?.paymentStatus || (order?.isPaid ? 'Paid' : 'Unpaid');

const buildOrderHtml = ({ heading, copy, order, ctaLabel, ctaUrl }) => {
  const orderId = order?._id?.toString?.() || '';
  const trackingNumber = order?.trackingNumber || 'Pending assignment';
  const deliveryNote = order?.deliveryNote || 'No delivery note has been added yet.';

  const timelineItems = (order?.statusHistory || [])
    .slice(-4)
    .map(
      (entry) => `
        <li style="margin-bottom:8px;">
          <strong>${entry.status || 'Update'}:</strong> ${entry.note || 'Status updated.'}
        </li>
      `
    )
    .join('');

  return wrapTemplate({
    title: heading,
    preheader: copy,
    body: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#3a4a63;">${copy}</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        ${summaryRow('Order ID', orderId)}
        ${summaryRow('Total', `$${Number(order?.totalPrice || 0).toFixed(2)}`)}
        ${summaryRow('Order Status', order?.orderStatus || 'Processing')}
        ${summaryRow('Payment', getPaymentLabel(order))}
        ${summaryRow('Tracking', trackingNumber)}
      </table>
      <div style="margin:20px 0;padding:18px;background:#f5f8fc;border:1px solid #dce4ef;border-radius:18px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#a07c16;">Delivery Note</div>
        <p style="margin:10px 0 0;font-size:14px;line-height:1.8;color:#3a4a63;">${deliveryNote}</p>
      </div>
      ${
        timelineItems
          ? `<div style="margin:20px 0;padding:18px;background:#fafbfd;border:1px solid #dce4ef;border-radius:18px;">
               <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#a07c16;">Recent timeline</div>
               <ul style="margin:12px 0 0;padding-left:18px;font-size:14px;line-height:1.8;color:#3a4a63;">${timelineItems}</ul>
             </div>`
          : ''
      }
      <a href="${ctaUrl}" style="display:inline-block;margin-top:10px;padding:14px 22px;border-radius:12px;background:#16365f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">${ctaLabel}</a>
      <a href="${buildInvoiceUrl(orderId)}" style="display:inline-block;margin-top:10px;margin-left:10px;padding:14px 22px;border-radius:12px;background:#ffffff;color:#16365f;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;border:1px solid #ccd8e8;">View Invoice</a>
    `,
  });
};

const sendOrderConfirmationEmail = async (order) =>
  sendMailSafe({
    label: 'order-placed',
    to: getSafeOrderRecipient(order),
    subject: `Apex Link Group Order Placed - ${order?._id?.toString?.() || ''}`,
    html: buildOrderHtml({
      heading: 'Your order has been placed',
      copy:
        'Thank you for ordering from Apex Link Group. We have received your order and will keep you updated when payment or fulfillment is confirmed.',
      order,
      ctaLabel: 'View Order',
      ctaUrl: buildOrderUrl(order?._id?.toString?.() || ''),
    }),
    developmentPayload: {
      orderId: order?._id?.toString?.() || '',
      orderStatus: order?.orderStatus || 'Processing',
      totalPrice: order?.totalPrice || 0,
    },
  });

const sendOrderPlacedEmail = sendOrderConfirmationEmail;

const sendOrderConfirmedEmail = async (order) =>
  sendMailSafe({
    label: 'order-confirmed',
    to: getSafeOrderRecipient(order),
    subject: `Apex Link Group Order Confirmed - ${order?._id?.toString?.() || ''}`,
    html: buildOrderHtml({
      heading: 'Your order is confirmed',
      copy:
        'Your order has been confirmed. We will continue preparing it and share final updates when the order is delivered or if a final status changes.',
      order,
      ctaLabel: 'View Order',
      ctaUrl: buildOrderUrl(order?._id?.toString?.() || ''),
    }),
    developmentPayload: {
      orderId: order?._id?.toString?.() || '',
      orderStatus: order?.orderStatus || 'Processing',
      paymentStatus: order?.paymentStatus || '',
    },
  });

const sendOrderCancelledEmail = async (order) =>
  sendMailSafe({
    label: 'order-cancelled',
    to: getSafeOrderRecipient(order),
    subject: `Apex Link Group Order Cancelled - ${order?._id?.toString?.() || ''}`,
    html: buildOrderHtml({
      heading: 'Your order was cancelled',
      copy:
        'Your order has been cancelled. Review the order page for the latest cancellation, payment, and refund details.',
      order,
      ctaLabel: 'View Order',
      ctaUrl: buildOrderUrl(order?._id?.toString?.() || ''),
    }),
    developmentPayload: {
      orderId: order?._id?.toString?.() || '',
      orderStatus: order?.orderStatus || 'Cancelled',
      paymentStatus: order?.paymentStatus || '',
    },
  });

const sendOrderDeliveredEmail = async (order) =>
  sendMailSafe({
    label: 'order-delivered',
    to: getSafeOrderRecipient(order),
    subject: `Apex Link Group Order Delivered - ${order?._id?.toString?.() || ''}`,
    html: buildOrderHtml({
      heading: 'Your order was delivered',
      copy:
        'Your order has been marked as delivered. Thank you for shopping with Apex Link Group.',
      order,
      ctaLabel: 'View Order',
      ctaUrl: buildOrderUrl(order?._id?.toString?.() || ''),
    }),
    developmentPayload: {
      orderId: order?._id?.toString?.() || '',
      orderStatus: order?.orderStatus || 'Delivered',
      deliveredAt: order?.deliveredAt || '',
    },
  });

const sendOrderStatusUpdateEmail = async (order) =>
  sendMailSafe({
    label: 'order-status-update',
    to: getSafeOrderRecipient(order),
    subject: `Apex Link Group Order Update - ${order?._id?.toString?.() || ''}`,
    html: buildOrderHtml({
      heading: 'Your order has a new update',
      copy:
        'There is a fresh fulfillment update on your order. Review the latest status, tracking, and delivery notes below.',
      order,
      ctaLabel: 'Track Order',
      ctaUrl: buildTrackUrl(),
    }),
    developmentPayload: {
      orderId: order?._id?.toString?.() || '',
      orderStatus: order?.orderStatus || 'Processing',
      trackingNumber: order?.trackingNumber || '',
    },
  });

const sendPasswordResetEmail = async (user, resetUrl) => {
  const html = wrapTemplate({
    title: 'Reset your password',
    preheader: 'Use the secure link below to set a new password for your Apex Link Group account.',
    body: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#3a4a63;">
        We received a request to reset the password for your Apex Link Group account. If this was you, use the secure link below.
      </p>
      <a href="${resetUrl}" style="display:inline-block;margin-top:10px;padding:14px 22px;border-radius:12px;background:#16365f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Reset Password</a>
      <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#6b7a92;">
        If you did not request this reset, you can safely ignore this email.
      </p>
    `,
  });

  const developmentPayload =
    process.env.NODE_ENV !== 'production'
      ? { resetUrl }
      : {};

  return sendMailSafe({
    label: 'password-reset',
    to: user?.email || '',
    subject: 'Reset your Apex Link Group password',
    html,
    developmentPayload,
  });
};

const sendAdminTwoFactorCodeEmail = async (user, code, expiresInMinutes = 10) =>
  sendMailSafe({
    label: 'admin-2fa-code',
    to: user?.email || '',
    subject: 'Your Apex Link Group admin verification code',
    html: wrapTemplate({
      title: 'Admin verification code',
      preheader: 'Use this code to complete your secure admin sign-in.',
      body: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#3a4a63;">
          Use the verification code below to complete your Apex Link Group admin sign-in. It expires in ${expiresInMinutes} minutes.
        </p>
        <div style="display:inline-block;margin:12px 0;padding:18px 24px;border-radius:16px;background:#f5f8fc;border:1px solid #dce4ef;font-size:28px;font-weight:800;letter-spacing:0.3em;color:#0b1f3a;">
          ${code}
        </div>
        <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#6b7a92;">
          If you were not trying to sign in, change your password and contact the site owner.
        </p>
      `,
    }),
    developmentPayload: {
      code,
      userId: user?._id?.toString?.() || '',
    },
  });

const sendSecurityAlertEmail = async (user, { title = 'Security alert', message = '', ipAddress = '' } = {}) =>
  sendMailSafe({
    label: 'security-alert',
    to: user?.email || '',
    subject: `Apex Link Group Security Alert - ${title}`,
    html: wrapTemplate({
      title,
      preheader: 'A security-sensitive event occurred on your Apex Link Group account.',
      body: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#3a4a63;">${message}</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;">
          ${summaryRow('Account', user?.email || '')}
          ${summaryRow('IP Address', ipAddress || 'Unknown')}
          ${summaryRow('Time', new Date().toISOString())}
        </table>
        <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#6b7a92;">
          If this was not you, reset your password immediately.
        </p>
      `,
    }),
    developmentPayload: {
      userId: user?._id?.toString?.() || '',
      ipAddress,
      message,
    },
  });

const sendContactMessageNotification = async (message) =>
  sendMailSafe({
    label: 'contact-notification',
    to: process.env.EMAIL_FROM || '',
    subject: `New Contact Message - ${message?.subject || 'Apex Link Group'}`,
    html: wrapTemplate({
      title: 'New customer message',
      preheader: 'A new contact form message was submitted on the Apex Link Group storefront.',
      body: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#3a4a63;">
          <strong>Name:</strong> ${message?.name || 'Not provided'}<br />
          <strong>Email:</strong> ${message?.email || 'Not provided'}<br />
          <strong>Phone:</strong> ${message?.phone || 'Not provided'}<br />
          <strong>Subject:</strong> ${message?.subject || 'Not provided'}
        </p>
        <div style="padding:18px;background:#f5f8fc;border:1px solid #dce4ef;border-radius:18px;font-size:14px;line-height:1.8;color:#3a4a63;">
          ${message?.message || ''}
        </div>
      `,
    }),
    developmentPayload: {
      email: message?.email || '',
      subject: message?.subject || '',
    },
  });

const sendContactAutoReply = async (message) =>
  sendMailSafe({
    label: 'contact-auto-reply',
    to: message?.email || '',
    subject: 'We received your message - Apex Link Group',
    html: wrapTemplate({
      title: 'Thank you for contacting Apex Link Group',
      preheader: 'Our team has received your message and will get back to you shortly.',
      body: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#3a4a63;">
          Thank you for reaching out to Apex Link Group. We have received your message and will respond as soon as possible.
        </p>
        <div style="padding:18px;background:#f5f8fc;border:1px solid #dce4ef;border-radius:18px;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#a07c16;">Subject</div>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.8;color:#3a4a63;">${message?.subject || ''}</p>
        </div>
      `,
    }),
    developmentPayload: {
      email: message?.email || '',
      subject: message?.subject || '',
    },
  });

const sendInvoiceEmail = async (order) =>
  sendMailSafe({
    label: 'invoice-email',
    to: getSafeOrderRecipient(order),
    subject: `Apex Link Group Invoice - ${order?._id?.toString?.() || ''}`,
    html: wrapTemplate({
      title: 'Your invoice is ready',
      preheader: 'You can review or print your invoice from your order dashboard.',
      body: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#3a4a63;">
          Your invoice for order <strong>${order?._id?.toString?.() || ''}</strong> is ready.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;">
          ${summaryRow('Total', `$${Number(order?.totalPrice || 0).toFixed(2)}`)}
          ${summaryRow('Payment', getPaymentLabel(order))}
          ${summaryRow('Order Status', order?.orderStatus || 'Processing')}
        </table>
        <a href="${buildInvoiceUrl(order?._id?.toString?.() || '')}" style="display:inline-block;margin-top:10px;padding:14px 22px;border-radius:12px;background:#16365f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Open Invoice</a>
      `,
    }),
    developmentPayload: {
      orderId: order?._id?.toString?.() || '',
      totalPrice: order?.totalPrice || 0,
    },
  });

const sendRefundConfirmationEmail = async (order, refund = {}) =>
  sendMailSafe({
    label: 'refund-confirmation',
    to: getSafeOrderRecipient(order),
    subject: `Apex Link Group Refund Update - ${order?._id?.toString?.() || ''}`,
    html: wrapTemplate({
      title: 'Your refund has been processed',
      preheader: 'A refund update is now available for your order.',
      body: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#3a4a63;">
          We processed a refund update for order <strong>${order?._id?.toString?.() || ''}</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;">
          ${summaryRow('Refund Amount', `$${Number(refund?.amount || 0).toFixed(2)}`)}
          ${summaryRow('Refund Status', refund?.status || order?.refundStatus || 'Updated')}
          ${summaryRow('Total Refunded', `$${Number(order?.refundedAmount || 0).toFixed(2)}`)}
          ${summaryRow('Payment Status', getPaymentLabel(order))}
        </table>
        <a href="${buildOrderUrl(order?._id?.toString?.() || '')}" style="display:inline-block;margin-top:10px;padding:14px 22px;border-radius:12px;background:#16365f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">View Order</a>
      `,
    }),
    developmentPayload: {
      orderId: order?._id?.toString?.() || '',
      refundId: refund?.refundId || '',
      amount: refund?.amount || 0,
      status: refund?.status || '',
    },
  });

const sendNewsletterWelcomeEmail = async (subscriber) =>
  sendMailSafe({
    label: 'newsletter-welcome',
    to: subscriber?.email || '',
    subject: 'Welcome to Apex Link Group updates',
    html: wrapTemplate({
      title: 'You are subscribed',
      preheader: 'You will receive marketplace launches, sourcing updates, and offers from Apex Link Group.',
      body: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#3a4a63;">
          Thank you for subscribing to Apex Link Group. We will send curated product drops, marketplace news, and sourcing updates.
        </p>
        <a href="${getFrontendUrl()}/products" style="display:inline-block;margin-top:10px;padding:14px 22px;border-radius:12px;background:#16365f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Explore Products</a>
      `,
    }),
    developmentPayload: {
      email: subscriber?.email || '',
      source: subscriber?.source || '',
    },
  });

const sendAbandonedCartEmail = async (cart) => {
  const rows = (cart.items || [])
    .slice(0, 6)
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;color:#3a4a63;">${item.name || 'Product'} x ${item.qty || 1}</td>
          <td style="padding:10px 0;text-align:right;font-weight:700;color:#0b1f3a;">${cart.currency || 'LKR'} ${Number((item.price || 0) * (item.qty || 1)).toFixed(2)}</td>
        </tr>
      `
    )
    .join('');

  return sendMailSafe({
    label: 'abandoned-cart',
    to: cart?.email || '',
    subject: 'Your Apex Link Group cart is waiting',
    html: wrapTemplate({
      title: 'Still thinking it over?',
      preheader: 'Your selected products are still waiting in your Apex Link Group cart.',
      body: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#3a4a63;">
          You left a few products in your cart. Return to checkout whenever you are ready.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">${rows}</table>
        ${summaryRow('Cart subtotal', `${cart.currency || 'LKR'} ${Number(cart.subtotal || 0).toFixed(2)}`)}
        <a href="${cart.checkoutUrl || `${getFrontendUrl()}/checkout`}" style="display:inline-block;margin-top:18px;padding:14px 22px;border-radius:12px;background:#16365f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Return to Cart</a>
      `,
    }),
    developmentPayload: {
      cartId: cart?._id?.toString?.() || '',
      email: cart?.email || '',
      subtotal: cart?.subtotal || 0,
    },
  });
};

const sendTestEmail = async (to = process.env.EMAIL_TEST_TO || process.env.EMAIL_FROM) =>
  sendMailSafe({
    label: 'smtp-test',
    to,
    subject: 'Apex Link Group SMTP test',
    html: wrapTemplate({
      title: 'SMTP is configured',
      preheader: 'This confirms that the Apex Link Group backend can send email through your SMTP provider.',
      body: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#3a4a63;">
          This test email was sent by the Apex Link Group backend. If you received it, SMTP delivery is ready for password resets, order updates, invoices, refunds, contact messages, newsletters, and abandoned cart reminders.
        </p>
      `,
    }),
    developmentPayload: {
      to,
    },
  });

export {
  getEmailConfigurationStatus,
  isEmailConfigured,
  sendOrderPlacedEmail,
  sendOrderConfirmationEmail,
  sendOrderConfirmedEmail,
  sendOrderCancelledEmail,
  sendOrderDeliveredEmail,
  sendOrderStatusUpdateEmail,
  sendInvoiceEmail,
  sendRefundConfirmationEmail,
  sendPasswordResetEmail,
  sendAdminTwoFactorCodeEmail,
  sendSecurityAlertEmail,
  sendContactMessageNotification,
  sendContactAutoReply,
  sendNewsletterWelcomeEmail,
  sendAbandonedCartEmail,
  sendTestEmail,
};
