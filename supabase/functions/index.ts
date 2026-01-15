/**
 * =====================================================
 * EDGE FUNCTION: SCAN UPLOADED FILE
 * =====================================================
 * 
 * Scans uploaded files using VirusTotal API and stores results
 * 
 * Features:
 * - File validation and size limits
 * - SHA256 hash calculation
 * - Deduplication (check existing scans)
 * - VirusTotal API integration
 * - Database persistence
 * - Comprehensive error handling
 * - CORS support
 * 
 * @author Alex (Engineer)
 * @version 1.0.0
 * @created 2025-01-15
 * =====================================================
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface ScanRequest {
  file: File;
  filePath: string;
  fileName: string;
}

interface ScanResponse {
  success: boolean;
  scanId?: string;
  status?: string;
  message?: string;
  error?: string;
  data?: {
    scanId: string;
    status: string;
    threatName?: string;
    threatSeverity?: string;
    enginesDetected: number;
    enginesTotal: number;
    permalink: string;
  };
}

interface VirusTotalAnalysisResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      status: 'queued' | 'in-progress' | 'completed';
      stats: {
        malicious: number;
        suspicious: number;
        undetected: number;
        harmless: number;
        timeout: number;
        'confirmed-timeout': number;
        failure: number;
        'type-unsupported': number;
      };
      results?: Record<string, any>;
      date: number;
    };
    links: {
      self: string;
      item: string;
    };
  };
}

interface VirusTotalFileReportResponse {
  data: {
    id: string;
    attributes: {
      last_analysis_stats: {
        malicious: number;
        suspicious: number;
        undetected: number;
        harmless: number;
        timeout: number;
        'confirmed-timeout': number;
        failure: number;
        'type-unsupported': number;
      };
      last_analysis_results: Record<string, any>;
      last_analysis_date: number;
      sha256: string;
    };
    links: {
      self: string;
    };
  };
}

// =====================================================
// CONFIGURATION
// =====================================================

const VIRUSTOTAL_API_KEY = Deno.env.get('VIRUSTOTAL_API_KEY');
const VIRUSTOTAL_BASE_URL = 'https://www.virustotal.com/api/v3';
const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB (VirusTotal free tier limit)
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 30; // 60 seconds total

// =====================================================
// CORS HEADERS
// =====================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Calculate SHA256 hash of file
 */
async function calculateSHA256(file: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', file);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Determine threat severity based on detection rate
 */
function determineThreatSeverity(
  maliciousCount: number,
  totalEngines: number
): 'low' | 'medium' | 'high' | 'critical' {
  const percentage = (maliciousCount / totalEngines) * 100;

  if (percentage >= 50) return 'critical';
  if (percentage >= 25) return 'high';
  if (percentage >= 10) return 'medium';
  return 'low';
}

/**
 * Extract most common threat name from results
 */
function extractThreatName(results: Record<string, any>): string | undefined {
  const threatNames: Record<string, number> = {};

  for (const engine in results) {
    const result = results[engine];
    if (result.category === 'malicious' && result.result) {
      threatNames[result.result] = (threatNames[result.result] || 0) + 1;
    }
  }

  if (Object.keys(threatNames).length === 0) return undefined;

  return Object.entries(threatNames).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =====================================================
// VIRUSTOTAL API FUNCTIONS
// =====================================================

/**
 * Check if file exists in VirusTotal database by hash
 */
async function getFileReport(sha256: string): Promise<VirusTotalFileReportResponse | null> {
  try {
    console.log('🔍 [VIRUSTOTAL] Checking existing report for hash:', sha256);

    const response = await fetch(`${VIRUSTOTAL_BASE_URL}/files/${sha256}`, {
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY!,
      },
    });

    if (response.status === 404) {
      console.log('ℹ️ [VIRUSTOTAL] No existing report found');
      return null;
    }

    if (!response.ok) {
      throw new Error(`VirusTotal API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [VIRUSTOTAL] Found existing report');
    return data;
  } catch (error) {
    console.error('❌ [VIRUSTOTAL] Error checking file report:', error);
    return null;
  }
}

/**
 * Upload file to VirusTotal for scanning
 */
async function uploadFile(fileData: Uint8Array, fileName: string): Promise<string> {
  console.log('📤 [VIRUSTOTAL] Uploading file:', fileName);

  const formData = new FormData();
  const blob = new Blob([fileData]);
  formData.append('file', blob, fileName);

  const response = await fetch(`${VIRUSTOTAL_BASE_URL}/files`, {
    method: 'POST',
    headers: {
      'x-apikey': VIRUSTOTAL_API_KEY!,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`VirusTotal upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ [VIRUSTOTAL] File uploaded, analysis ID:', data.data.id);
  return data.data.id;
}

/**
 * Get analysis result by ID
 */
async function getAnalysis(analysisId: string): Promise<VirusTotalAnalysisResponse> {
  const response = await fetch(`${VIRUSTOTAL_BASE_URL}/analyses/${analysisId}`, {
    headers: {
      'x-apikey': VIRUSTOTAL_API_KEY!,
    },
  });

  if (!response.ok) {
    throw new Error(`VirusTotal analysis fetch failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Poll for analysis result until completed
 */
async function pollAnalysisResult(analysisId: string): Promise<VirusTotalAnalysisResponse> {
  console.log('⏳ [VIRUSTOTAL] Polling for analysis result...');

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    const analysis = await getAnalysis(analysisId);
    const status = analysis.data.attributes.status;

    console.log(`🔄 [VIRUSTOTAL] Status: ${status} (${attempt}/${MAX_POLL_ATTEMPTS})`);

    if (status === 'completed') {
      console.log('✅ [VIRUSTOTAL] Analysis completed');
      return analysis;
    }

    if (attempt < MAX_POLL_ATTEMPTS) {
      await sleep(POLL_INTERVAL);
    }
  }

  throw new Error('Analysis timeout - took too long to complete');
}

// =====================================================
// DATABASE FUNCTIONS
// =====================================================

/**
 * Check if file scan already exists in database
 */
async function checkExistingScan(
  supabase: any,
  sha256: string,
  userId: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from('file_scans')
    .select('*')
    .eq('file_hash_sha256', sha256)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ [DATABASE] Error checking existing scan:', error);
    return null;
  }

  return data;
}

/**
 * Save scan result to database
 */
async function saveScanResult(
  supabase: any,
  userId: string,
  filePath: string,
  fileName: string,
  fileSize: number,
  sha256: string,
  mimeType: string,
  scanResult: any
): Promise<void> {
  console.log('💾 [DATABASE] Saving scan result...');

  const { error } = await supabase.from('file_scans').insert({
    user_id: userId,
    file_path: filePath,
    file_name: fileName,
    file_size: fileSize,
    file_hash_sha256: sha256,
    file_mime_type: mimeType,
    scan_status: scanResult.status,
    threat_name: scanResult.threatName,
    threat_category: scanResult.threatCategory,
    threat_severity: scanResult.threatSeverity,
    virustotal_scan_id: scanResult.scanId,
    virustotal_permalink: scanResult.permalink,
    engines_detected: scanResult.enginesDetected,
    engines_total: scanResult.enginesTotal,
    virustotal_response: scanResult.rawResponse,
    scan_started_at: new Date().toISOString(),
    scan_completed_at: new Date().toISOString(),
  });

  if (error) {
    console.error('❌ [DATABASE] Error saving scan result:', error);
    throw new Error('Failed to save scan result to database');
  }

  console.log('✅ [DATABASE] Scan result saved successfully');
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 [EDGE FUNCTION] Scan request received');

    // Validate API key
    if (!VIRUSTOTAL_API_KEY) {
      throw new Error('VirusTotal API key not configured');
    }

    // Get authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [AUTH] User authenticated:', user.id);

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const filePath = formData.get('filePath') as string;
    const fileName = formData.get('fileName') as string;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📁 [FILE] Processing:', fileName, `(${file.size} bytes)`);

    // Read file data
    const fileData = new Uint8Array(await file.arrayBuffer());

    // Calculate SHA256 hash
    const sha256 = await calculateSHA256(fileData);
    console.log('🔐 [HASH] SHA256:', sha256);

    // Check if already scanned
    const existingScan = await checkExistingScan(supabase, sha256, user.id);
    if (existingScan) {
      console.log('✅ [CACHE] Found existing scan result');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'File already scanned',
          data: {
            scanId: existingScan.virustotal_scan_id,
            status: existingScan.scan_status,
            threatName: existingScan.threat_name,
            threatSeverity: existingScan.threat_severity,
            enginesDetected: existingScan.engines_detected,
            enginesTotal: existingScan.engines_total,
            permalink: existingScan.virustotal_permalink,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check VirusTotal database first
    const existingReport = await getFileReport(sha256);
    let scanResult: any;

    if (existingReport) {
      // Use existing report
      const stats = existingReport.data.attributes.last_analysis_stats;
      const results = existingReport.data.attributes.last_analysis_results;
      const maliciousCount = stats.malicious + stats.suspicious;
      const totalEngines = Object.keys(results).length;
      const isInfected = maliciousCount > 0;

      scanResult = {
        scanId: existingReport.data.id,
        status: isInfected ? 'infected' : 'clean',
        threatName: isInfected ? extractThreatName(results) : undefined,
        threatCategory: isInfected ? 'malware' : undefined,
        threatSeverity: isInfected
          ? determineThreatSeverity(maliciousCount, totalEngines)
          : undefined,
        enginesDetected: maliciousCount,
        enginesTotal: totalEngines,
        permalink: existingReport.data.links.self,
        rawResponse: existingReport,
      };
    } else {
      // Upload and scan
      const analysisId = await uploadFile(fileData, fileName || 'file');
      const analysis = await pollAnalysisResult(analysisId);

      const stats = analysis.data.attributes.stats;
      const results = analysis.data.attributes.results || {};
      const maliciousCount = stats.malicious + stats.suspicious;
      const totalEngines = Object.keys(results).length;
      const isInfected = maliciousCount > 0;

      scanResult = {
        scanId: analysis.data.id,
        status: isInfected ? 'infected' : 'clean',
        threatName: isInfected ? extractThreatName(results) : undefined,
        threatCategory: isInfected ? 'malware' : undefined,
        threatSeverity: isInfected
          ? determineThreatSeverity(maliciousCount, totalEngines)
          : undefined,
        enginesDetected: maliciousCount,
        enginesTotal: totalEngines,
        permalink: analysis.data.links.self,
        rawResponse: analysis,
      };
    }

    // Save to database
    await saveScanResult(
      supabase,
      user.id,
      filePath || '',
      fileName || file.name,
      file.size,
      sha256,
      file.type,
      scanResult
    );

    console.log('✅ [SUCCESS] Scan completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scan completed',
        data: {
          scanId: scanResult.scanId,
          status: scanResult.status,
          threatName: scanResult.threatName,
          threatSeverity: scanResult.threatSeverity,
          enginesDetected: scanResult.enginesDetected,
          enginesTotal: scanResult.enginesTotal,
          permalink: scanResult.permalink,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [ERROR]', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});