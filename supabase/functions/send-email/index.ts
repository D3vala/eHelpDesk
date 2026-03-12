import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, message, staffName, ticketId } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'to and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailSubject = subject || (ticketId ? `Re: Ticket ${ticketId} — eHelpDesk` : 'Message from eHelpDesk Support');

    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
          <span style="font-size:22px;">🎧</span>
          <span style="font-size:18px;font-weight:700;color:#111;">eHelpDesk</span>
        </div>
        <hr style="border:none;border-top:1px solid #eaeaea;margin-bottom:24px;">
        <p style="color:#555;font-size:14px;margin-bottom:8px;">
          You have received a reply from <strong>${staffName || 'Support Staff'}</strong>
          ${ticketId ? `regarding ticket <strong>${ticketId}</strong>` : ''}.
        </p>
        <div style="background:#f9f9f9;border-left:4px solid #111;border-radius:4px;padding:16px 20px;margin:20px 0;font-size:14px;color:#333;white-space:pre-wrap;">${message}</div>
        <p style="font-size:13px;color:#888;">
          Please do not reply to this email directly. Log in to 
          <a href="https://ehelpdesk.app" style="color:#111;font-weight:600;">eHelpDesk</a> 
          to view your ticket and respond.
        </p>
        <hr style="border:none;border-top:1px solid #eaeaea;margin-top:24px;">
        <p style="font-size:11px;color:#aaa;text-align:center;">Mapúa University — eHelpDesk Support System</p>
      </div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'eHelpDesk <onboarding@resend.dev>',
        to: [to],
        subject: emailSubject,
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'Resend error', details: result }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
