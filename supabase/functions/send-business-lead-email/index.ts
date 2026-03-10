const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BusinessLeadRequest {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  quantity: string;
  message: string;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] 📧 [BUSINESS LEAD] Nova requisição recebida`);
  console.log(`[${requestId}] 📋 Método: ${req.method}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] ✅ Respondendo preflight CORS`);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    let body: BusinessLeadRequest;
    try {
      body = await req.json();
      console.log(`[${requestId}] 📦 Body recebido:`, {
        companyName: body?.companyName,
        contactName: body?.contactName,
        email: body?.email,
        quantity: body?.quantity,
      });
    } catch (e) {
      console.error(`[${requestId}] ❌ Erro ao parsear body:`, e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { companyName, contactName, email, phone, quantity, message } = body;

    // Validate required fields
    if (!companyName || !contactName || !email || !phone || !quantity) {
      console.error(`[${requestId}] ❌ Campos obrigatórios faltando`);
      return new Response(
        JSON.stringify({ error: 'Todos os campos obrigatórios devem ser preenchidos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Resend API Key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error(`[${requestId}] ❌ RESEND_API_KEY não configurada`);
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${requestId}] 📧 Enviando email via Resend...`);

    // Format the email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Novo Lead B2B - Vero iD</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a0a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111111; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">🏢 Novo Lead Empresarial</h1>
                    <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Vero iD - Plataforma B2B</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px;">
                    <p style="margin: 0 0 25px 0; color: #06b6d4; font-size: 18px; font-weight: bold;">
                      📋 Detalhes do Contato
                    </p>
                    
                    <!-- Company Name -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                      <tr>
                        <td style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid #06b6d4;">
                          <p style="margin: 0 0 5px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Empresa</p>
                          <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: bold;">${companyName}</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Contact Name -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                      <tr>
                        <td style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                          <p style="margin: 0 0 5px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Nome do Contato</p>
                          <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: bold;">${contactName}</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Email -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                      <tr>
                        <td style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                          <p style="margin: 0 0 5px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</p>
                          <p style="margin: 0; color: #ffffff; font-size: 16px;">
                            <a href="mailto:${email}" style="color: #06b6d4; text-decoration: none;">${email}</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Phone -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                      <tr>
                        <td style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                          <p style="margin: 0 0 5px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Telefone</p>
                          <p style="margin: 0; color: #ffffff; font-size: 16px;">
                            <a href="tel:${phone}" style="color: #06b6d4; text-decoration: none;">${phone}</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Quantity -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                      <tr>
                        <td style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                          <p style="margin: 0 0 5px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Quantidade de Assinaturas</p>
                          <p style="margin: 0; color: #f59e0b; font-size: 20px; font-weight: bold;">${quantity} assinaturas/mês</p>
                        </td>
                      </tr>
                    </table>
                    
                    ${message ? `
                    <!-- Message -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                      <tr>
                        <td style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid #ec4899;">
                          <p style="margin: 0 0 5px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Mensagem</p>
                          <p style="margin: 0; color: #ffffff; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                    
                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 25px;">
                      <tr>
                        <td align="center">
                          <a href="mailto:${email}?subject=Re: Interesse em Plano Empresarial Vero iD" 
                             style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 14px;">
                            📧 Responder ao Lead
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #0a0a0a; padding: 20px; border-top: 1px solid #333;">
                    <p style="margin: 0; color: #666; font-size: 12px; line-height: 1.5; text-align: center;">
                      Este email foi enviado automaticamente pelo formulário de contato B2B.<br>
                      © ${new Date().getFullYear()} Vero iD. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vero iD <contato@veroid.com.br>',
        to: ['contato@veroid.com.br'],
        reply_to: email,
        subject: `🏢 Novo Lead B2B: ${companyName} - ${quantity} assinaturas`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error(`[${requestId}] ❌ Erro do Resend:`, resendData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${requestId}] ✅ Email enviado com sucesso:`, resendData);

    // Also send confirmation email to the lead
    const confirmationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recebemos seu contato - Vero iD</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a0a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111111; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">🛡️ Vero iD</h1>
                    <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Autenticidade Digital para Criadores</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px;">
                    <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 18px;">
                      Olá, <strong style="color: #06b6d4;">${contactName}</strong>! 👋
                    </p>
                    
                    <p style="margin: 0 0 20px 0; color: #cccccc; font-size: 14px; line-height: 1.6;">
                      Recebemos sua solicitação de contato para o plano empresarial da <strong>${companyName}</strong>.
                    </p>
                    
                    <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; border: 1px solid #333; margin-bottom: 20px;">
                      <p style="margin: 0 0 10px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Resumo da sua solicitação:</p>
                      <p style="margin: 0; color: #06b6d4; font-size: 18px; font-weight: bold;">📊 ${quantity} assinaturas/mês</p>
                    </div>
                    
                    <p style="margin: 0 0 20px 0; color: #cccccc; font-size: 14px; line-height: 1.6;">
                      Nossa equipe comercial entrará em contato em até <strong style="color: #10b981;">24 horas úteis</strong> para apresentar as melhores condições para sua empresa.
                    </p>
                    
                    <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%); padding: 20px; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.3);">
                      <p style="margin: 0; color: #06b6d4; font-size: 14px; line-height: 1.6;">
                        💡 <strong>Enquanto isso:</strong> Conheça mais sobre como o Vero iD pode proteger o conteúdo da sua equipe em <a href="https://www.veroid.com.br" style="color: #3b82f6;">veroid.com.br</a>
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #0a0a0a; padding: 20px; border-top: 1px solid #333;">
                    <p style="margin: 0 0 10px 0; color: #888; font-size: 12px; text-align: center;">
                      Dúvidas? Responda este email ou entre em contato:
                    </p>
                    <p style="margin: 0; color: #06b6d4; font-size: 14px; text-align: center;">
                      <a href="mailto:contato@veroid.com.br" style="color: #06b6d4; text-decoration: none;">contato@veroid.com.br</a>
                    </p>
                    <p style="margin: 15px 0 0 0; color: #666; font-size: 11px; text-align: center;">
                      © ${new Date().getFullYear()} Vero iD. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send confirmation to lead
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vero iD <contato@veroid.com.br>',
        to: [email],
        subject: '✅ Recebemos seu contato - Vero iD Empresas',
        html: confirmationHtml,
      }),
    });

    console.log(`[${requestId}] ✅ Email de confirmação enviado para o lead`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mensagem enviada com sucesso! Entraremos em contato em breve.',
        emailId: resendData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] ❌ Erro não tratado:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});