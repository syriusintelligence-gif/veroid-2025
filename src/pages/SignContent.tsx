import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Shield, ArrowLeft, Loader2, FileText, Image as ImageIcon, Video, FileType, Music, Upload, X, Check, AlertCircle, Images } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/supabase-auth';
import type { User as UserType } from '@/lib/supabase-auth';
import { getKeyPair } from '@/lib/supabase-crypto';
import { signContent } from '@/lib/services/supabase-crypto-enhanced';
import type { KeyPair, SignedContent } from '@/lib/supabase-crypto';
import ContentCard from '@/components/ContentCard';
import { compressImage, isImageDataUrl } from '@/lib/image-compression';
// 🆕 CAMERA CAPTURE - Componente para captura de foto pela câmera
import { CameraCapture } from '@/components/CameraCapture';
// 🆕 RATE LIMITING - Imports adicionados
import { useRateLimit } from '@/hooks/useRateLimit';
import { RateLimitAlert } from '@/components/RateLimitAlert';
// 🔒 SEGURANÇA: Validação de arquivos com lista branca
import { validateFile, getAcceptString, getExtensionDescription } from '@/lib/file-validator';
import type { FileCategory } from '@/lib/file-validator';
// 🎬 VIDEO PROCESSING - Apenas thumbnail (SEM compressão)
import { 
  generateThumbnail, 
  isVideoFile, 
  formatFileSize
} from '@/lib/video-processor';
// ========================================
// INÍCIO: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7 (SILENCIOSA)
// ========================================
import { calculateFileHash } from '@/hooks/useFileScanStatus';
import { supabase } from '@/lib/supabase';
// ========================================
// FIM: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
// ========================================
// ========================================
// 🔒 SEGURANÇA: SANITIZAÇÃO DE NOMES DE ARQUIVOS - ETAPA 2
// ========================================
import { sanitizeFileName } from '@/lib/input-sanitizer';
// ========================================
// FIM: SANITIZAÇÃO DE NOMES DE ARQUIVOS - ETAPA 2
// ========================================
// ========================================
// 🆕 FASE 2: INTEGRAÇÃO COM SUPABASE STORAGE
// ========================================
import { 
  moveToSignedDocuments,
  deleteFile
} from '@/lib/services/storage-service';
// 🆕 UPLOAD COM PROGRESSO
import { uploadToTempBucketWithProgress } from '@/lib/services/storage-service-with-progress';
// ========================================
// FIM: INTEGRAÇÃO COM SUPABASE STORAGE
// ========================================
// ========================================
// 🆕 FASE 3: AUDIT LOGGING
// ========================================
import { logAuditEvent, AuditAction } from '@/lib/audit-logger';
// ========================================
// FIM: AUDIT LOGGING
// ========================================
// ========================================
// 🆕 DOCUMENT PREVIEW GENERATOR
// ========================================
import { generateDocumentPreview, isDocumentFile } from '@/lib/document-preview-generator';
// ========================================
// FIM: DOCUMENT PREVIEW GENERATOR
// ========================================
// ========================================
// 🆕 MUSIC PREVIEW GENERATOR
// ========================================
import { generateMusicPreview, isMusicFile } from '@/lib/music-preview-generator';
// ========================================
// FIM: MUSIC PREVIEW GENERATOR
// ========================================
// ========================================
// 🆕 CONTADOR DE ASSINATURAS - PROBLEMA 4
// ========================================
import { useSignatureStatus, consumeSignature } from '@/hooks/useSubscription';
// ========================================
// FIM: CONTADOR DE ASSINATURAS
// ========================================
// ========================================
// 🎠 CAROUSEL IMPORTS
// ========================================
import { uploadCarouselImages, moveCarouselToSignedDocuments, deleteCarouselImages } from '@/lib/services/carousel-storage';
import type { CarouselMetadata } from '@/lib/types/carousel';
// ========================================
// FIM: CAROUSEL IMPORTS
// ========================================

type ContentType = 'text' | 'image' | 'video' | 'document' | 'music' | 'carousel';

