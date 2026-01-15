/**
 * =====================================================
 * VIRUSTOTAL API CLIENT
 * =====================================================
 * 
 * Client for interacting with VirusTotal API v3
 * 
 * Features:
 * - File upload and scanning
 * - Analysis result retrieval
 * - Hash-based file lookup (optimization)
 * - Rate limiting (4 requests/minute for free tier)
 * - Retry logic with exponential backoff
 * - Detailed error handling and logging
 * 
 * @author Alex (Engineer)
 * @version 1.0.0
 * @created 2025-01-15
 * =====================================================
 */

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface VirusTotalConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface VirusTotalUploadResponse {
  data: {
    type: string;
    id: string;
    links: {
      self: string;
    };
  };
}

export interface VirusTotalAnalysisResponse {
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
      results?: {
        [engineName: string]: {
          category: string;
          engine_name: string;
          engine_version: string;
          result: string | null;
          method: string;
          engine_update: string;
        };
      };
      date: number;
    };
    links: {
      self: string;
      item: string;
    };
  };
  meta?: {
    file_info: {
      sha256: string;
      md5: string;
      sha1: string;
      size: number;
    };
  };
}

export interface VirusTotalFileReportResponse {
  data: {
    id: string;
    type: string;
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
      last_analysis_results: {
        [engineName: string]: {
          category: string;
          engine_name: string;
          engine_version: string;
          result: string | null;
          method: string;
          engine_update: string;
        };
      };
      last_analysis_date: number;
      sha256: string;
      md5: string;
      sha1: string;
      size: number;
      type_description: string;
      meaningful_name: string;
    };
    links: {
      self: string;
    };
  };
}

export interface ScanResult {
  scanId: string;
  status: 'pending' | 'scanning' | 'clean' | 'infected' | 'error' | 'timeout';
  threatName?: string;
  threatCategory?: string;
  threatSeverity?: 'low' | 'medium' | 'high' | 'critical';
  enginesDetected: number;
  enginesTotal: number;
  permalink: string;
  rawResponse: VirusTotalAnalysisResponse | VirusTotalFileReportResponse;
}

export interface VirusTotalError {
  code: string;
  message: string;
  statusCode: number;
}

// =====================================================
// VIRUSTOTAL CLIENT CLASS
// =====================================================

export class VirusTotalClient {
  private config: Required<VirusTotalConfig>;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
  private readonly MAX_REQUESTS_PER_MINUTE = 4; // Free tier limit

  constructor(config: VirusTotalConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://www.virustotal.com/api/v3',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    };

    if (!this.config.apiKey) {
      throw new Error('VirusTotal API key is required');
    }
  }

  // =====================================================
  // RATE LIMITING
  // =====================================================

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Reset counter if window has passed
    if (timeSinceLastRequest >= this.RATE_LIMIT_WINDOW) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }

    // Check if we've hit the rate limit
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = this.RATE_LIMIT_WINDOW - timeSinceLastRequest;
      console.warn(
        `⏳ [VIRUSTOTAL] Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`
      );
      await this.sleep(waitTime);
      this.requestCount = 0;
      this.lastRequestTime = Date.now();
    }

    this.requestCount++;
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async calculateSHA256(file: File | Blob): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  private determineThreatSeverity(
    maliciousCount: number,
    totalEngines: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const percentage = (maliciousCount / totalEngines) * 100;

    if (percentage >= 50) return 'critical';
    if (percentage >= 25) return 'high';
    if (percentage >= 10) return 'medium';
    return 'low';
  }

  private extractThreatName(
    results: Record<string, any>
  ): string | undefined {
    // Find the most common threat name
    const threatNames: Record<string, number> = {};

    for (const engine in results) {
      const result = results[engine];
      if (result.category === 'malicious' && result.result) {
        threatNames[result.result] = (threatNames[result.result] || 0) + 1;
      }
    }

    if (Object.keys(threatNames).length === 0) return undefined;

    // Return the most common threat name
    return Object.entries(threatNames).sort((a, b) => b[1] - a[1])[0][0];
  }

  // =====================================================
  // API REQUEST WRAPPER
  // =====================================================

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.enforceRateLimit();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'x-apikey': this.config.apiKey,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          code: errorData.error?.code || 'UNKNOWN_ERROR',
          message: errorData.error?.message || response.statusText,
          statusCode: response.status,
        } as VirusTotalError;
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw {
          code: 'TIMEOUT',
          message: 'Request timeout',
          statusCode: 408,
        } as VirusTotalError;
      }

      throw error;
    }
  }

  // =====================================================
  // RETRY LOGIC
  // =====================================================

  private async retryRequest<T>(
    fn: () => Promise<T>,
    retries: number = this.config.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries === 0) throw error;

      const isRetryable =
        error.statusCode === 429 || // Rate limit
        error.statusCode === 503 || // Service unavailable
        error.statusCode === 504 || // Gateway timeout
        error.code === 'TIMEOUT';

      if (!isRetryable) throw error;

      const delay = this.config.retryDelay * (this.config.maxRetries - retries + 1);
      console.warn(
        `⚠️ [VIRUSTOTAL] Request failed (${error.code}). Retrying in ${delay}ms... (${retries} retries left)`
      );

      await this.sleep(delay);
      return this.retryRequest(fn, retries - 1);
    }
  }

  // =====================================================
  // PUBLIC API METHODS
  // =====================================================

  /**
   * Upload a file to VirusTotal for scanning
   */
  async uploadFile(file: File | Blob): Promise<VirusTotalUploadResponse> {
    console.log('📤 [VIRUSTOTAL] Uploading file for scanning...');

    const formData = new FormData();
    formData.append('file', file);

    return this.retryRequest(async () => {
      const response = await this.makeRequest<VirusTotalUploadResponse>(
        `${this.config.baseUrl}/files`,
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log('✅ [VIRUSTOTAL] File uploaded successfully:', response.data.id);
      return response;
    });
  }

  /**
   * Get analysis result by analysis ID
   */
  async getAnalysis(analysisId: string): Promise<VirusTotalAnalysisResponse> {
    console.log('🔍 [VIRUSTOTAL] Fetching analysis result:', analysisId);

    return this.retryRequest(async () => {
      const response = await this.makeRequest<VirusTotalAnalysisResponse>(
        `${this.config.baseUrl}/analyses/${analysisId}`
      );

      console.log(
        '✅ [VIRUSTOTAL] Analysis result fetched:',
        response.data.attributes.status
      );
      return response;
    });
  }

  /**
   * Get file report by SHA256 hash (faster than uploading)
   */
  async getFileReport(sha256: string): Promise<VirusTotalFileReportResponse> {
    console.log('🔍 [VIRUSTOTAL] Fetching file report by hash:', sha256);

    return this.retryRequest(async () => {
      const response = await this.makeRequest<VirusTotalFileReportResponse>(
        `${this.config.baseUrl}/files/${sha256}`
      );

      console.log('✅ [VIRUSTOTAL] File report fetched');
      return response;
    });
  }

  /**
   * Scan a file and wait for results
   */
  async scanFile(file: File | Blob): Promise<ScanResult> {
    console.log('🛡️ [VIRUSTOTAL] Starting file scan...');

    try {
      // Calculate SHA256 hash
      const sha256 = await this.calculateSHA256(file);
      console.log('🔐 [VIRUSTOTAL] File hash:', sha256);

      // Try to get existing report first (optimization)
      try {
        const report = await this.getFileReport(sha256);
        console.log('✅ [VIRUSTOTAL] Found existing scan result');
        return this.parseFileReport(report);
      } catch (error: any) {
        if (error.statusCode === 404) {
          console.log('ℹ️ [VIRUSTOTAL] No existing scan found, uploading file...');
        } else {
          throw error;
        }
      }

      // Upload file for scanning
      const uploadResponse = await this.uploadFile(file);
      const analysisId = uploadResponse.data.id;

      // Poll for results
      return await this.pollAnalysisResult(analysisId);
    } catch (error: any) {
      console.error('❌ [VIRUSTOTAL] Scan failed:', error);
      throw error;
    }
  }

  /**
   * Poll analysis result until completed
   */
  private async pollAnalysisResult(
    analysisId: string,
    maxAttempts: number = 30,
    pollInterval: number = 2000
  ): Promise<ScanResult> {
    console.log('⏳ [VIRUSTOTAL] Polling for analysis result...');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const analysis = await this.getAnalysis(analysisId);
      const status = analysis.data.attributes.status;

      console.log(
        `🔄 [VIRUSTOTAL] Analysis status: ${status} (attempt ${attempt}/${maxAttempts})`
      );

      if (status === 'completed') {
        console.log('✅ [VIRUSTOTAL] Analysis completed');
        return this.parseAnalysisResult(analysis);
      }

      if (attempt < maxAttempts) {
        await this.sleep(pollInterval);
      }
    }

    throw {
      code: 'TIMEOUT',
      message: 'Analysis timeout - took too long to complete',
      statusCode: 408,
    } as VirusTotalError;
  }

  /**
   * Parse analysis result into ScanResult
   */
  private parseAnalysisResult(
    analysis: VirusTotalAnalysisResponse
  ): ScanResult {
    const stats = analysis.data.attributes.stats;
    const results = analysis.data.attributes.results || {};

    const maliciousCount = stats.malicious + stats.suspicious;
    const totalEngines = Object.keys(results).length;

    const isInfected = maliciousCount > 0;
    const threatName = isInfected ? this.extractThreatName(results) : undefined;
    const threatSeverity = isInfected
      ? this.determineThreatSeverity(maliciousCount, totalEngines)
      : undefined;

    return {
      scanId: analysis.data.id,
      status: isInfected ? 'infected' : 'clean',
      threatName,
      threatCategory: isInfected ? 'malware' : undefined,
      threatSeverity,
      enginesDetected: maliciousCount,
      enginesTotal: totalEngines,
      permalink: analysis.data.links.self,
      rawResponse: analysis,
    };
  }

  /**
   * Parse file report into ScanResult
   */
  private parseFileReport(
    report: VirusTotalFileReportResponse
  ): ScanResult {
    const stats = report.data.attributes.last_analysis_stats;
    const results = report.data.attributes.last_analysis_results;

    const maliciousCount = stats.malicious + stats.suspicious;
    const totalEngines = Object.keys(results).length;

    const isInfected = maliciousCount > 0;
    const threatName = isInfected ? this.extractThreatName(results) : undefined;
    const threatSeverity = isInfected
      ? this.determineThreatSeverity(maliciousCount, totalEngines)
      : undefined;

    return {
      scanId: report.data.id,
      status: isInfected ? 'infected' : 'clean',
      threatName,
      threatCategory: isInfected ? 'malware' : undefined,
      threatSeverity,
      enginesDetected: maliciousCount,
      enginesTotal: totalEngines,
      permalink: report.data.links.self,
      rawResponse: report,
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let virusTotalClientInstance: VirusTotalClient | null = null;

export function getVirusTotalClient(apiKey?: string): VirusTotalClient {
  if (!virusTotalClientInstance) {
    const key = apiKey || import.meta.env.VITE_VIRUSTOTAL_API_KEY;
    
    if (!key) {
      throw new Error(
        'VirusTotal API key not found. Please set VITE_VIRUSTOTAL_API_KEY environment variable.'
      );
    }

    virusTotalClientInstance = new VirusTotalClient({ apiKey: key });
  }

  return virusTotalClientInstance;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Quick scan function for easy usage
 */
export async function scanFileWithVirusTotal(
  file: File | Blob
): Promise<ScanResult> {
  const client = getVirusTotalClient();
  return await client.scanFile(file);
}

/**
 * Check if file hash exists in VirusTotal database
 */
export async function checkFileHash(sha256: string): Promise<ScanResult | null> {
  try {
    const client = getVirusTotalClient();
    const report = await client.getFileReport(sha256);
    return client['parseFileReport'](report);
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null; // File not found in VirusTotal database
    }
    throw error;
  }
}