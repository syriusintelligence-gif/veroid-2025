/**
 * =====================================================
 * VERO iD - TIPOS TYPESCRIPT PARA SISTEMA DE PASTAS
 * =====================================================
 */

/**
 * Interface para pasta de certificados
 */
export interface CertificateFolder {
  id: string;
  userId: string;
  name: string;
  parentFolderId: string | null;
  color: string;
  icon: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface para item da pasta (relação pasta-certificado)
 */
export interface CertificateFolderItem {
  id: string;
  folderId: string;
  contentId: string;
  position: number;
  createdAt: string;
}

/**
 * Interface para pasta com contagem de certificados
 */
export interface FolderWithCount extends CertificateFolder {
  certificateCount: number;
  subfolderCount: number;
}

/**
 * Interface para breadcrumb de navegação
 */
export interface FolderBreadcrumb {
  id: string;
  name: string;
}

/**
 * Opções para criar pasta
 */
export interface CreateFolderOptions {
  name: string;
  parentFolderId?: string | null;
  color?: string;
  icon?: string;
  position?: number;
}

/**
 * Opções para atualizar pasta
 */
export interface UpdateFolderOptions {
  name?: string;
  color?: string;
  icon?: string;
  position?: number;
}

/**
 * Resultado de operação de pasta
 */
export interface FolderOperationResult {
  success: boolean;
  folder?: CertificateFolder;
  error?: string;
}

/**
 * Resultado de listagem de pastas
 */
export interface FolderListResult {
  success: boolean;
  folders?: CertificateFolder[];
  error?: string;
}

/**
 * Resultado de operação de mover certificado
 */
export interface MoveCertificateResult {
  success: boolean;
  error?: string;
}