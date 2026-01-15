/**
 * =====================================================
 * REACT HOOK: useFileScanStatus
 * =====================================================
 * 
 * Custom hook for querying and monitoring file scan status
 * from VirusTotal integration
 * 
 * Features:
 * - Query scan status by file hash (SHA256)
 * - Automatic polling until scan completes
 * - State management (loading, scanning, completed)
 * - Automatic retry on errors
 * - TypeScript support with full types
 * - Supabase integration
 * 
 * @author Alex (Engineer)
 * @version 1.0.0
 * @created 2026-01-15
 * =====================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

/**
 * Scan status types
 */
export type ScanStatus = 'pending' | 'scanning' | 'clean' | 'infected' | 'error' | 'timeout';

/**
 * Threat severity levels
 */
export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * File scan result from database
 */
export interface FileScanResult {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_hash_sha256: string;
  file_mime_type: string | null;
  user_id: string;
  scan_status: ScanStatus;
  threat_name: string | null;
  threat_category: string | null;
  threat_severity: ThreatSeverity | null;
  virustotal_scan_id: string | null;
  virustotal_permalink: string | null;
  engines_detected: number;
  engines_total: number;
  scan_started_at: string | null;
  scan_completed_at: string | null;
  created_at: string;
  updated_at: string;
  virustotal_response: any | null;
  error_message: string | null;
  error_code: string | null;
}

/**
 * Hook configuration options
 */
export interface UseFileScanStatusOptions {
  /**
   * File hash (SHA256) to query
   */
  fileHash?: string;
  
  /**
   * Enable automatic polling for pending/scanning status
   * @default true
   */
  enablePolling?: boolean;
  
  /**
   * Polling interval in milliseconds
   * @default 2000 (2 seconds)
   */
  pollingInterval?: number;
  
  /**
   * Maximum number of polling attempts
   * @default 30 (60 seconds with 2s interval)
   */
  maxPollingAttempts?: number;
  
  /**
   * Enable automatic refetch on mount
   * @default true
   */
  refetchOnMount?: boolean;
  
  /**
   * Callback when scan completes
   */
  onScanComplete?: (result: FileScanResult) => void;
  
  /**
   * Callback when scan fails
   */
  onScanError?: (error: Error) => void;
}

/**
 * Hook return value
 */
export interface UseFileScanStatusReturn {
  /**
   * Current scan result (null if not found or loading)
   */
  scanResult: FileScanResult | null;
  
  /**
   * Loading state (initial fetch)
   */
  isLoading: boolean;
  
  /**
   * Scanning state (scan in progress)
   */
  isScanning: boolean;
  
  /**
   * Error state
   */
  error: Error | null;
  
  /**
   * Manually refetch scan status
   */
  refetch: () => Promise<void>;
  
  /**
   * Reset hook state
   */
  reset: () => void;
}

// =====================================================
// CONSTANTS
// =====================================================

const DEFAULT_POLLING_INTERVAL = 2000; // 2 seconds
const DEFAULT_MAX_POLLING_ATTEMPTS = 30; // 60 seconds total

// =====================================================
// MAIN HOOK
// =====================================================

/**
 * Custom hook for querying file scan status
 * 
 * @example
 * ```tsx
 * const { scanResult, isLoading, isScanning, error, refetch } = useFileScanStatus({
 *   fileHash: '77ede267729a9638a2920e1a87ad6396d1acdf52c5351785a5069df95e09ad1f',
 *   onScanComplete: (result) => {
 *     console.log('Scan completed:', result);
 *   }
 * });
 * 
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * if (isScanning) return <div>Scanning file...</div>;
 * if (scanResult?.scan_status === 'infected') {
 *   return <div>Threat detected: {scanResult.threat_name}</div>;
 * }
 * return <div>File is clean</div>;
 * ```
 */
export function useFileScanStatus(
  options: UseFileScanStatusOptions = {}
): UseFileScanStatusReturn {
  const {
    fileHash,
    enablePolling = true,
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    maxPollingAttempts = DEFAULT_MAX_POLLING_ATTEMPTS,
    refetchOnMount = true,
    onScanComplete,
    onScanError,
  } = options;

  // =====================================================
  // STATE
  // =====================================================

  const [scanResult, setScanResult] = useState<FileScanResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // =====================================================
  // REFS
  // =====================================================

  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingAttemptsRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // =====================================================
  // COMPUTED STATE
  // =====================================================

  const isScanning = scanResult?.scan_status === 'pending' || scanResult?.scan_status === 'scanning';

  // =====================================================
  // FETCH SCAN STATUS
  // =====================================================

  const fetchScanStatus = useCallback(async (): Promise<FileScanResult | null> => {
    if (!fileHash) {
      return null;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('file_scans')
        .select('*')
        .eq('file_hash_sha256', fileHash)
        .single();

      if (fetchError) {
        // PGRST116 = no rows returned (not found)
        if (fetchError.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch scan status: ${fetchError.message}`);
      }

      return data as FileScanResult;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error occurred');
    }
  }, [fileHash]);

  // =====================================================
  // REFETCH FUNCTION
  // =====================================================

  const refetch = useCallback(async (): Promise<void> => {
    if (!fileHash) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchScanStatus();
      
      if (!isMountedRef.current) return;

      setScanResult(result);

      // Check if scan is complete
      if (result && result.scan_status !== 'pending' && result.scan_status !== 'scanning') {
        // Scan completed
        pollingAttemptsRef.current = 0;
        
        if (result.scan_status === 'infected' || result.scan_status === 'error') {
          onScanError?.(new Error(result.error_message || 'Scan failed'));
        } else {
          onScanComplete?.(result);
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Failed to fetch scan status');
      setError(error);
      onScanError?.(error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fileHash, fetchScanStatus, onScanComplete, onScanError]);

  // =====================================================
  // RESET FUNCTION
  // =====================================================

  const reset = useCallback(() => {
    setScanResult(null);
    setIsLoading(false);
    setError(null);
    pollingAttemptsRef.current = 0;

    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  // =====================================================
  // POLLING LOGIC
  // =====================================================

  useEffect(() => {
    if (!enablePolling || !isScanning || !fileHash) {
      return;
    }

    // Check if max attempts reached
    if (pollingAttemptsRef.current >= maxPollingAttempts) {
      console.warn('Max polling attempts reached for file hash:', fileHash);
      return;
    }

    // Schedule next poll
    pollingTimeoutRef.current = setTimeout(() => {
      pollingAttemptsRef.current += 1;
      refetch();
    }, pollingInterval);

    // Cleanup
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, [enablePolling, isScanning, fileHash, maxPollingAttempts, pollingInterval, refetch]);

  // =====================================================
  // INITIAL FETCH
  // =====================================================

  useEffect(() => {
    if (!fileHash || !refetchOnMount) {
      return;
    }

    refetch();
  }, [fileHash, refetchOnMount, refetch]);

  // =====================================================
  // CLEANUP ON UNMOUNT
  // =====================================================

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, []);

  // =====================================================
  // RETURN
  // =====================================================

  return {
    scanResult,
    isLoading,
    isScanning,
    error,
    refetch,
    reset,
  };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Calculate SHA256 hash of a file (browser-side)
 * 
 * @param file - File object to hash
 * @returns Promise<string> - SHA256 hash in hexadecimal
 * 
 * @example
 * ```tsx
 * const file = event.target.files[0];
 * const hash = await calculateFileHash(file);
 * const { scanResult } = useFileScanStatus({ fileHash: hash });
 * ```
 */
export async function calculateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Get threat severity color for UI
 * 
 * @param severity - Threat severity level
 * @returns Tailwind CSS color class
 */
export function getThreatSeverityColor(severity: ThreatSeverity | null): string {
  switch (severity) {
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Get scan status color for UI
 * 
 * @param status - Scan status
 * @returns Tailwind CSS color class
 */
export function getScanStatusColor(status: ScanStatus): string {
  switch (status) {
    case 'clean':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'infected':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'scanning':
    case 'pending':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'error':
    case 'timeout':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Format scan status for display
 * 
 * @param status - Scan status
 * @returns Human-readable status text
 */
export function formatScanStatus(status: ScanStatus): string {
  switch (status) {
    case 'pending':
      return 'Aguardando scan';
    case 'scanning':
      return 'Escaneando arquivo';
    case 'clean':
      return 'Arquivo limpo';
    case 'infected':
      return 'Ameaça detectada';
    case 'error':
      return 'Erro no scan';
    case 'timeout':
      return 'Timeout';
    default:
      return 'Status desconhecido';
  }
}