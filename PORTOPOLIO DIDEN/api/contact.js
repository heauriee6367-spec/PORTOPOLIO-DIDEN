const nodemailer = require('nodemailer');
const { parseJsonBody } = require('./_utils');

function validateContactPayload(payload) {
  const errors = [];
  if (!payload.name || payload.name.trim().length < 2) {
    errors.push('Nama minimal 2 karakter.');
  }
  if (!payload.email || !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(payload.email)) {
    errors.push('Email tidak valid.');
  }
  if (!payload.subject || payload.subject.trim().length < 5) {
    errors.push('Subjek minimal 5 karakter.');
  }
  if (!payload.message || payload.message.trim().length < 10) {
    errors.push('Pesan minimal 10 karakter.');
  }
  return errors;
}

function createMailTransport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const payload = await parseJsonBody(req);
    const errors = validateContactPayload(payload);
    if (errors.length) {
      res.status(400).json({ message: errors[0] });
      return;
    }

    let message = 'Pesan diterima. Terima kasih!';

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const transporter = createMailTransport();

      await transporter.sendMail({
        from: `"Portofolio Diden" <${process.env.GMAIL_USER}>`,
        to: process.env.CONTACT_TO_EMAIL || process.env.GMAIL_USER,
        replyTo: payload.email.trim(),
        subject: `Portofolio pesan: ${payload.subject.trim()}`,
        text: [
          `Nama: ${payload.name.trim()}`,
          `Email: ${payload.email.trim()}`,
          `Subjek: ${payload.subject.trim()}`,
          '',
          payload.message.trim()
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h3>Pesan dari portofolio</h3>
            <p><strong>Nama:</strong> ${payload.name.trim()}</p>
            <p><strong>Email:</strong> ${payload.email.trim()}</p>
            <p><strong>Subjek:</strong> ${payload.subject.trim()}</p>
            <hr />
            <p>${payload.message.trim().replace(/\n/g, '<br />')}</p>
          </div>
        `
      });
      message = 'Pesan berhasil dikirim. Saya akan membalas secepatnya.';
    } else {
      console.warn('Gmail credentials are not configured.');
      message = 'Pesan diterima, tetapi notifikasi email belum aktif. Tambahkan GMAIL_USER dan GMAIL_APP_PASSWORD di Environment Variables Vercel.';
    }

    res.status(200).json({ message });
  } catch (error) {
    console.error('Contact API error:', error);

    const smtpError = /Invalid login|authentication failed|EAUTH/i.test(error.message || '');
    res.status(smtpError ? 503 : 500).json({
      message: smtpError
        ? 'Gagal mengirim email. Periksa GMAIL_USER dan GMAIL_APP_PASSWORD di Vercel.'
        : (error.message || 'Terjadi kesalahan pada server.')
    });
  }
};
