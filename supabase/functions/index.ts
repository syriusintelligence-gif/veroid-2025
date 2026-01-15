// Edge Function para scanning de arquivos com VirusTotal
// Deno Deploy environment

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Tipos
interface ScanResult {
  scanId: string;
  status: 'clean' | 'infected' | 'error';
  threatName?: string;
  threatSeverity?: 'low' | 'medium' | 'high' | 'critical';
  enginesDetected: number;
  enginesTotal: number;
  permalink: string;
}

interface VirusTotalAnalysis {
  data: {
    attributes: {
      stats: {
        malicious: number;
        suspicious: number;
        undetected: number;
        harmless: number;
        timeout: number;
      };
      results: Record<string, {
        category: string;
        engine_name: string;
        result: string | null;
      }>;
    };
  };
}

// Configuração
const VIRUSTOTAL_API_KEY = Deno.env.get('VIRUSTOTAL_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Validar configuração
if (!VIRUSTOTAL_API_KEY) {
  console.error('❌ VIRUSTOTAL_API_KEY not configured');
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase credentials not configured');
}

// Handler principal
Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('📥 Received scan request');

    // Validar configuração
    if (!VIRUSTOTAL_API_KEY) {
      throw new Error('VirusTotal API key not configured');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // Autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verificar usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse multipart/form-data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    const filePath = formData.get('filePath') as string;

    if (!file || !fileName || !filePath) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: file, fileName, filePath' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📄 File received:', fileName, 'Size:', file.size, 'bytes');

    // Validar tamanho (32MB limit)
    const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'File too large. Maximum size is 32MB' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular hash SHA256
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('🔐 File hash:', fileHash);

    // Verificar se já existe scan para este hash
    const { data: existingScan } = await supabase
      .from('file_scans')
      .select('*')
      .eq('file_hash', fileHash)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingScan && existingScan.scan_status !== 'error') {
      console.log('♻️ Using cached scan result');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Scan result from cache',
          data: {
            scanId: existingScan.id,
            status: existingScan.scan_status,
            threatName: existingScan.threat_name,
            threatSeverity: existingScan.threat_severity,
            enginesDetected: existingScan.engines_detected,
            enginesTotal: existingScan.engines_total,
            permalink: existingScan.vt_permalink,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload para VirusTotal
    console.log('⬆️ Uploading to VirusTotal...');
    const uploadFormData = new FormData();
    uploadFormData.append('file', new Blob([fileBuffer]), fileName);

    const uploadResponse = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`VirusTotal upload failed: ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    const analysisId = uploadResult.data.id;

    console.log('✅ File uploaded to VirusTotal, analysis ID:', analysisId);

    // Polling para resultado (max 30 tentativas = 60 segundos)
    let scanResult: ScanResult | null = null;
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 segundos

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Polling attempt ${attempt}/${maxAttempts}...`);

      const analysisResponse = await fetch(
        `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
        {
          headers: {
            'x-apikey': VIRUSTOTAL_API_KEY,
          },
        }
      );

      if (!analysisResponse.ok) {
        throw new Error(`VirusTotal analysis failed: ${analysisResponse.statusText}`);
      }

      const analysis: VirusTotalAnalysis = await analysisResponse.json();
      const stats = analysis.data.attributes.stats;

      // Verificar se análise está completa
      if (stats.malicious + stats.suspicious + stats.undetected + stats.harmless > 0) {
        console.log('✅ Analysis complete:', stats);

        const enginesTotal = Object.keys(analysis.data.attributes.results).length;
        const enginesDetected = stats.malicious + stats.suspicious;
        const isInfected = enginesDetected > 0;

        // Determinar threat name e severity
        let threatName: string | undefined;
        let threatSeverity: 'low' | 'medium' | 'high' | 'critical' | undefined;

        if (isInfected) {
          // Pegar o primeiro resultado malicioso
          const results = analysis.data.attributes.results;
          for (const [engine, result] of Object.entries(results)) {
            if (result.category === 'malicious' && result.result) {
              threatName = result.result;
              break;
            }
          }

          // Classificar severidade baseado na porcentagem de detecção
          const detectionRate = enginesDetected / enginesTotal;
          if (detectionRate >= 0.7) {
            threatSeverity = 'critical';
          } else if (detectionRate >= 0.4) {
            threatSeverity = 'high';
          } else if (detectionRate >= 0.2) {
            threatSeverity = 'medium';
          } else {
            threatSeverity = 'low';
          }
        }

        scanResult = {
          scanId: analysisId,
          status: isInfected ? 'infected' : 'clean',
          threatName,
          threatSeverity,
          enginesDetected,
          enginesTotal,
          permalink: `https://www.virustotal.com/gui/file/${fileHash}`,
        };

        break;
      }

      // Aguardar antes da próxima tentativa
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    if (!scanResult) {
      throw new Error('Analysis timeout - VirusTotal took too long to process');
    }

    // Salvar resultado no banco
    console.log('💾 Saving scan result to database...');
    const { error: insertError } = await supabase
      .from('file_scans')
      .insert({
        user_id: user.id,
        file_name: fileName,
        file_path: filePath,
        file_hash: fileHash,
        file_size: file.size,
        scan_status: scanResult.status,
        vt_scan_id: scanResult.scanId,
        vt_permalink: scanResult.permalink,
        threat_name: scanResult.threatName,
        threat_severity: scanResult.threatSeverity,
        engines_detected: scanResult.enginesDetected,
        engines_total: scanResult.enginesTotal,
        scan_date: new Date().toISOString(),
      });

    if (insertError) {
      console.error('❌ Failed to save scan result:', insertError);
      throw insertError;
    }

    console.log('✅ Scan completed successfully');

    // Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scan completed',
        data: scanResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});