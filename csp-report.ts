import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * CSP Violation Report Endpoint
 * 
 * Receives and logs Content Security Policy violation reports
 * sent by browsers when CSP directives are violated.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 */

interface CSPViolation {
  'document-uri': string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  'blocked-uri': string;
  'status-code': number;
  'source-file'?: string;
  'line-number'?: number;
  'column-number'?: number;
}

interface CSPReport {
  'csp-report': CSPViolation;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      message: 'This endpoint only accepts POST requests'
    });
  }

  try {
    const report: CSPReport = req.body;

    // Validate report structure
    if (!report || !report['csp-report']) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Invalid CSP report format'
      });
    }

    const violation = report['csp-report'];

    // Log the violation (in production, send to monitoring service)
    console.log('🔒 CSP Violation Report:', {
      timestamp: new Date().toISOString(),
      documentUri: violation['document-uri'],
      violatedDirective: violation['violated-directive'],
      effectiveDirective: violation['effective-directive'],
      blockedUri: violation['blocked-uri'],
      sourceFile: violation['source-file'],
      lineNumber: violation['line-number'],
      columnNumber: violation['column-number'],
      statusCode: violation['status-code']
    });

    // Group similar violations to detect patterns
    const violationType = violation['effective-directive'];
    const blockedResource = violation['blocked-uri'];

    // Log aggregated metrics (in production, use proper analytics)
    console.log('📊 CSP Metrics:', {
      type: violationType,
      resource: blockedResource,
      count: 1 // In production, aggregate counts
    });

    // Return success response
    return res.status(204).end();

  } catch (error) {
    console.error('❌ Error processing CSP report:', error);
    
    // Don't expose internal errors to client
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to process CSP report'
    });
  }
}

/**
 * Configuration for Vercel serverless function
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10kb', // Limit report size
    },
  },
};