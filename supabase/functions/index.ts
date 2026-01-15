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
 * @version 1.3.0
 * @created 2025-01-15
 * @updated 2026-01-15 - Fixed "File already scanned" infinite loading bug
 * =====================================================
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface ScanRequest {
  file_name: string;
  file_size: number;
  file_hash: string;
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
  fileName: string,
  fileSize: number,
  sha256: string,
  scanResult: any
): Promise<void> {
  console.log('💾 [DATABASE] Saving scan result...');

  const { error } = await supabase.from('file_scans').insert({
    user_id: userId,
    file_path: '',
    file_name: fileName,
    file_size: fileSize,
    file_hash_sha256: sha256,
    file_mime_type: null,
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

/**
 * 🆕 Update existing scan result in database
 */
async function updateScanResult(
  supabase: any,
  scanId: string,
  scanResult: any
): Promise<void> {
  console.log('🔄 [DATABASE] Updating scan result...');

  const { error } = await supabase
    .from('file_scans')
    .update({
      scan_status: scanResult.status,
      threat_name: scanResult.threatName,
      threat_category: scanResult.threatCategory,
      threat_severity: scanResult.threatSeverity,
      virustotal_scan_id: scanResult.scanId,
      virustotal_permalink: scanResult.permalink,
      engines_detected: scanResult.enginesDetected,
      engines_total: scanResult.enginesTotal,
      virustotal_response: scanResult.rawResponse,
      scan_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', scanId);

  if (error) {
    console.error('❌ [DATABASE] Error updating scan result:', error);
    throw new Error('Failed to update scan result in database');
  }

  console.log('✅ [DATABASE] Scan result updated successfully');
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

    // Parse JSON body
    const body: ScanRequest = await req.json();
    const { file_name, file_size, file_hash } = body;

    if (!file_name || !file_size || !file_hash) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: file_name, file_size, file_hash' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (file_size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📁 [FILE] Processing:', file_name, `(${file_size} bytes)`);
    console.log('🔐 [HASH] SHA256:', file_hash);

    // =====================================================
    // 🆕 BUGFIX: Check if already scanned AND verify status
    // =====================================================
    const existingScan = await checkExistingScan(supabase, file_hash, user.id);
    
    if (existingScan) {
      console.log('✅ [CACHE] Found existing scan result');
      
      // 🆕 If status is 'pending' or 'scanning', check VirusTotal for updates
      if (existingScan.scan_status === 'pending' || existingScan.scan_status === 'scanning') {
        console.log('🔄 [UPDATE] Existing scan is incomplete, checking VirusTotal for updates...');
        
        const existingReport = await getFileReport(file_hash);
        
        if (existingReport) {
          // Update with completed scan results
          const stats = existingReport.data.attributes.last_analysis_stats;
          const results = existingReport.data.attributes.last_analysis_results;
          const maliciousCount = stats.malicious + stats.suspicious;
          const totalEngines = Object.keys(results).length;
          const isInfected = maliciousCount > 0;

          const updatedScanResult = {
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

          // Update database
          await updateScanResult(supabase, existingScan.id, updatedScanResult);

          console.log('✅ [UPDATE] Scan result updated to:', updatedScanResult.status);

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Scan completed',
              data: {
                scanId: updatedScanResult.scanId,
                status: updatedScanResult.status,
                threatName: updatedScanResult.threatName,
                threatSeverity: updatedScanResult.threatSeverity,
                enginesDetected: updatedScanResult.enginesDetected,
                enginesTotal: updatedScanResult.enginesTotal,
                permalink: updatedScanResult.permalink,
              },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // Return existing scan result (already completed)
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

    // Check VirusTotal database
    const existingReport = await getFileReport(file_hash);
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
      // File not in VirusTotal database - mark as pending
      scanResult = {
        scanId: file_hash,
        status: 'pending',
        threatName: undefined,
        threatCategory: undefined,
        threatSeverity: undefined,
        enginesDetected: 0,
        enginesTotal: 0,
        permalink: `https://www.virustotal.com/gui/file/${file_hash}`,
        rawResponse: null,
      };
    }

    // Save to database
    await saveScanResult(
      supabase,
      user.id,
      file_name,
      file_size,
      file_hash,
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