/**
 * =====================================================
 * REACT COMPONENT: FileScanStatus
 * =====================================================
 * 
 * Visual component for displaying file scan status
 * from VirusTotal integration
 * 
 * Features:
 * - Visual status indicators (loading, scanning, clean, infected)
 * - Animated progress indicators
 * - Threat severity badges with colors
 * - Link to full VirusTotal report
 * - Responsive design with Tailwind CSS
 * - Integration with useFileScanStatus hook
 * 
 * @author Alex (Engineer)
 * @version 1.0.0
 * @created 2026-01-15
 * =====================================================
 */

'use client';

import React from 'react';
import {
  useFileScanStatus,
  formatScanStatus,
  getScanStatusColor,
  getThreatSeverityColor,
  type FileScanResult,
  type ScanStatus,
  type ThreatSeverity,
} from '@/hooks/useFileScanStatus';
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface FileScanStatusProps {
  /**
   * File hash (SHA256) to display status for
   */
  fileHash: string;

  /**
   * Show detailed information
   * @default true
   */
  showDetails?: boolean;

  /**
   * Show link to VirusTotal report
   * @default true
   */
  showVirusTotalLink?: boolean;

  /**
   * Compact mode (smaller UI)
   * @default false
   */
  compact?: boolean;

  /**
   * Custom CSS classes
   */
  className?: string;

  /**
   * Callback when scan completes
   */
  onScanComplete?: (result: FileScanResult) => void;

  /**
   * Callback when scan fails
   */
  onScanError?: (error: Error) => void;
}

// =====================================================
// ICON COMPONENTS
// =====================================================

const StatusIcon: React.FC<{ status: ScanStatus; className?: string }> = ({ status, className = 'w-5 h-5' }) => {
  switch (status) {
    case 'clean':
      return <CheckCircle className={`${className} text-green-600`} />;
    case 'infected':
      return <AlertTriangle className={`${className} text-red-600`} />;
    case 'scanning':
    case 'pending':
      return <Loader2 className={`${className} text-blue-600 animate-spin`} />;
    case 'error':
    case 'timeout':
      return <XCircle className={`${className} text-gray-600`} />;
    default:
      return <Shield className={`${className} text-gray-600`} />;
  }
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export const FileScanStatus: React.FC<FileScanStatusProps> = ({
  fileHash,
  showDetails = true,
  showVirusTotalLink = true,
  compact = false,
  className = '',
  onScanComplete,
  onScanError,
}) => {
  const { scanResult, isLoading, isScanning, error } = useFileScanStatus({
    fileHash,
    onScanComplete,
    onScanError,
  });

  // =====================================================
  // LOADING STATE
  // =====================================================

  if (isLoading) {
    return (
      <div className={`flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="text-sm text-blue-700 font-medium">Carregando status do scan...</span>
      </div>
    );
  }

  // =====================================================
  // ERROR STATE
  // =====================================================

  if (error) {
    return (
      <div className={`flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <XCircle className="w-5 h-5 text-red-600" />
        <div className="flex-1">
          <p className="text-sm text-red-700 font-medium">Erro ao verificar scan</p>
          <p className="text-xs text-red-600 mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // NO SCAN FOUND
  // =====================================================

  if (!scanResult) {
    return (
      <div className={`flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <Shield className="w-5 h-5 text-gray-600" />
        <span className="text-sm text-gray-700 font-medium">Nenhum scan encontrado para este arquivo</span>
      </div>
    );
  }

  // =====================================================
  // COMPACT MODE
  // =====================================================

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <StatusIcon status={scanResult.scan_status} className="w-4 h-4" />
        <span className={`text-xs font-medium ${getScanStatusColor(scanResult.scan_status)}`}>
          {formatScanStatus(scanResult.scan_status)}
        </span>
      </div>
    );
  }

  // =====================================================
  // FULL MODE
  // =====================================================

  const statusColor = getScanStatusColor(scanResult.scan_status);
  const isInfected = scanResult.scan_status === 'infected';
  const isClean = scanResult.scan_status === 'clean';

  return (
    <div className={`p-4 border rounded-lg ${statusColor} ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <StatusIcon status={scanResult.scan_status} className="w-6 h-6" />
          <div>
            <h3 className="text-sm font-semibold">
              {formatScanStatus(scanResult.scan_status)}
            </h3>
            <p className="text-xs opacity-75 mt-0.5">{scanResult.file_name}</p>
          </div>
        </div>

        {/* Threat Severity Badge */}
        {isInfected && scanResult.threat_severity && (
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${getThreatSeverityColor(
              scanResult.threat_severity
            )}`}
          >
            {scanResult.threat_severity.toUpperCase()}
          </span>
        )}
      </div>

      {/* Scanning Progress */}
      {isScanning && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="opacity-75">Escaneando arquivo...</span>
            <span className="font-medium">
              {scanResult.engines_detected} / {scanResult.engines_total} engines
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 animate-pulse"
              style={{
                width: scanResult.engines_total > 0
                  ? `${(scanResult.engines_detected / scanResult.engines_total) * 100}%`
                  : '0%',
              }}
            />
          </div>
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div className="space-y-2 text-xs">
          {/* Threat Information */}
          {isInfected && scanResult.threat_name && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">Ameaça detectada:</p>
                <p className="text-red-600 mt-0.5">{scanResult.threat_name}</p>
                {scanResult.threat_category && (
                  <p className="text-red-600 opacity-75 mt-0.5">
                    Categoria: {scanResult.threat_category}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Clean Information */}
          {isClean && (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-700">Arquivo seguro</p>
                <p className="text-green-600 opacity-75 mt-0.5">
                  Nenhuma ameaça detectada por {scanResult.engines_total} antivírus
                </p>
              </div>
            </div>
          )}

          {/* Scan Statistics */}
          <div className="flex items-center gap-4 pt-2 border-t border-current opacity-50">
            <div>
              <p className="opacity-75">Engines:</p>
              <p className="font-medium">
                {scanResult.engines_detected} / {scanResult.engines_total}
              </p>
            </div>
            {scanResult.scan_completed_at && (
              <div>
                <p className="opacity-75">Concluído em:</p>
                <p className="font-medium">
                  {new Date(scanResult.scan_completed_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VirusTotal Link */}
      {showVirusTotalLink && scanResult.virustotal_permalink && (
        <a
          href={scanResult.virustotal_permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-3 text-xs font-medium hover:underline opacity-75 hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="w-3 h-3" />
          Ver relatório completo no VirusTotal
        </a>
      )}
    </div>
  );
};

// =====================================================
// EXPORT DEFAULT
// =====================================================

export default FileScanStatus;