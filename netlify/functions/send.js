// Across the Bridge: sends the parent's thank-you email and notifies you (Netlify Function, uses Resend).
// Settings live in Netlify > Site configuration > Environment variables:
//   RESEND_API_KEY, FROM_EMAIL, ORG_EMAIL (comma-separated personal emails), LOGO_URL (optional)

async function send(from, to, subject, html, replyTo, text) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [].concat(to), subject, html, text, reply_to: replyTo })
  });
  if (!r.ok) throw new Error('Resend error: ' + (await r.text()));
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const d = JSON.parse(event.body || '{}');
    if (d.website) return { statusCode: 200, body: 'ok' };            // honeypot: bots fill this
    const email = String(d.email || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || !d.parent || !d.child) return { statusCode: 400, body: 'invalid' };

    const from = process.env.FROM_EMAIL;
    const orgs = String(process.env.ORG_EMAIL || '').split(',').map(x => x.trim()).filter(Boolean);
    const camp = d.camp || 'not specified';

    // 1) Branded thank-you to the parent
    await send(from, email, 'We have received your interest | Across the Bridge',
      confirmHtml_(d, camp, process.env.LOGO_URL), orgs[0],
      'Hello ' + d.parent + ', thank you for your interest in Across the Bridge for ' + d.child + ' (' + camp + '). We have received your details and will be in touch with upcoming programme information. Call or WhatsApp +254 714 285 694. Across the Bridge');

    // 2) Notification to you
    if (orgs.length) await send(from, orgs, 'New camp interest: ' + d.child + ' (' + camp + ')',
      '<p><b>Parent/Guardian:</b> ' + esc_(d.parent) + '<br><b>Child:</b> ' + esc_(d.child) + ' (age ' + esc_(d.age) + ')<br><b>Phone:</b> ' + esc_(d.phone) +
      '<br><b>Email:</b> ' + esc_(email) + '<br><b>Camp:</b> ' + esc_(camp) + '<br><b>Message:</b> ' + esc_(d.message || '') + '</p>', email);

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'error' };
  }
};

function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

function confirmHtml_(d, camp, logoUrl) {
  var navy = '#1c3f7c', orange = '#e8661a', sun = '#f7a21b', sand = '#fff7ea';
  var head = logoUrl
    ? '<img src="' + esc_(logoUrl) + '" alt="Across the Bridge" width="150" style="display:block;margin:0 auto 10px;background:#fff;border-radius:12px;padding:6px">'
    : '<div style="font:800 28px Georgia,serif;color:#fff">Across the Bridge</div>';
  var row = function (k, v) { return '<tr><td style="padding:4px 12px 4px 0;color:#4d5d69">' + k + '</td><td style="padding:4px 0;font-weight:bold;color:' + navy + '">' + esc_(v) + '</td></tr>'; };
  return '<div style="background:' + sand + ';padding:24px 12px;font-family:Arial,Helvetica,sans-serif">' +
    '<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden" cellpadding="0" cellspacing="0">' +
    '<tr><td style="background:' + navy + ';padding:28px 24px;text-align:center">' + head +
      '<div style="color:#cfe0f5;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin-top:4px">Mentorship School &middot; Unlocking Potential</div></td></tr>' +
    '<tr><td style="height:6px;background:' + sun + '"></td></tr>' +
    '<tr><td style="padding:32px 28px;color:#1d2b36;font-size:16px;line-height:1.6">' +
      '<h1 style="margin:0 0 14px;font:bold 24px Georgia,serif;color:' + navy + '">Thank you, ' + esc_(d.parent) + '!</h1>' +
      '<p style="margin:0 0 16px">We have received your interest in Across the Bridge for <b>' + esc_(d.child) + '</b>. We are glad you reached out.</p>' +
      '<p style="margin:0 0 16px">Our team will be in touch with upcoming programme information. This message confirms we have your details; it is not a confirmed place.</p>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" style="background:' + sand + ';border-radius:12px;padding:14px 18px;width:100%;margin:0 0 20px;font-size:15px">' +
        '<tr><td colspan="2" style="padding:0 0 6px;font-weight:bold;color:' + orange + '">What you sent us</td></tr>' +
        row('Child', d.child) + row('Age', d.age) + row('Interested in', camp) + row('Phone', d.phone) + '</table>' +
      '<p style="margin:0 0 6px">Questions? Reply to this email, or reach us here:</p>' +
      '<p style="margin:0;font-size:15px">Phone / WhatsApp: <a href="tel:+254714285694" style="color:' + navy + '">+254 714 285 694</a><br>' +
        'Email: <a href="mailto:acrossthebridge25@gmail.com" style="color:' + navy + '">acrossthebridge25@gmail.com</a></p>' +
      '<p style="margin:22px 0 0">Warm regards,<br><b style="color:' + navy + '">The Across the Bridge team</b></p>' +
    '</td></tr>' +
    '<tr><td style="background:#f3ead8;padding:16px 24px;text-align:center;font-size:12px;color:#4d5d69">' +
      'Across the Bridge Mentorship School &middot; P.O. Box 4008-30200, Kitale, Kenya<br>You received this because someone submitted an interest form on our website using this email address.</td></tr>' +
    '</table></div>';
}
