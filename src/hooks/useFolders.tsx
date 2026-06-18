/**
 * =====================================================
 * VERO iD - HOOK PARA GERENCIAMENTO DE PASTAS
 * =====================================================
 * 
 * Hook React para gerenciar estado e operações de pastas.
 * 
 * @author VeroID Team
 * @version 1.0.0
 * @date 2026-06-18
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getUserFolders,
  getRootFolders,
  getSubfolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveCertificateToFolder,
  removeCertificateFromFolder,
  getCertificatesInFolder,
  getCertificateFolder,
} from '@/lib/services/folder-service';
import type {
  CertificateFolder,
  CreateFolderOptions,
  UpdateFolderOptions,
} from '@/lib/types/folders';

interface UseFoldersOptions {
  userId: string;
  autoLoad?: boolean;
}

interface UseFoldersReturn {
  folders: CertificateFolder[];
  rootFolders: CertificateFolder[];
  currentFolder: CertificateFolder | null;
  isLoading: boolean;
  error: string | null;
  
  // Operações de pasta
  loadFolders: () => Promise<void>;
  loadRootFolders: () => Promise<void>;
  loadSubfolders: (parentId: string) => Promise<CertificateFolder[]>;
  handleCreateFolder: (options: CreateFolderOptions) => Promise<CertificateFolder | null>;
  handleUpdateFolder: (folderId: string, options: UpdateFolderOptions) => Promise<boolean>;
  handleDeleteFolder: (folderId: string) => Promise<boolean>;
  
  // Operações de certificados
  handleMoveCertificate: (contentId: string, folderId: string) => Promise<boolean>;
  handleRemoveCertificate: (contentId: string) => Promise<boolean>;
  getCertificatesInCurrentFolder: () => Promise<string[]>;
  getFolderForCertificate: (contentId: string) => Promise<string | null>;
  
  // Navegação
  setCurrentFolder: (folder: CertificateFolder | null) => void;
  navigateToFolder: (folderId: string) => void;
  navigateToRoot: () => void;
}

/**
 * Hook para gerenciar pastas de certificados
 */
export function useFolders({ userId, autoLoad = true }: UseFoldersOptions): UseFoldersReturn {
  const [folders, setFolders] = useState<CertificateFolder[]>([]);
  const [rootFolders, setRootFolders] = useState<CertificateFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<CertificateFolder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega todas as pastas do usuário
   */
  const loadFolders = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await getUserFolders(userId);

      if (result.success && result.folders) {
        setFolders(result.folders);
      } else {
        setError(result.error || 'Erro ao carregar pastas');
        setFolders([]);
      }
    } catch (err) {
      console.error('❌ [useFolders] Erro ao carregar pastas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setFolders([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Carrega apenas pastas raiz
   */
  const loadRootFolders = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await getRootFolders(userId);

      if (result.success && result.folders) {
        setRootFolders(result.folders);
      } else {
        setError(result.error || 'Erro ao carregar pastas raiz');
        setRootFolders([]);
      }
    } catch (err) {
      console.error('❌ [useFolders] Erro ao carregar pastas raiz:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setRootFolders([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Carrega subpastas de uma pasta específica
   */
  const loadSubfolders = useCallback(async (parentId: string): Promise<CertificateFolder[]> => {
    if (!userId) return [];

    try {
      const result = await getSubfolders(userId, parentId);

      if (result.success && result.folders) {
        return result.folders;
      } else {
        console.error('❌ [useFolders] Erro ao carregar subpastas:', result.error);
        return [];
      }
    } catch (err) {
      console.error('❌ [useFolders] Erro ao carregar subpastas:', err);
      return [];
    }
  }, [userId]);

  /**
   * Cria uma nova pasta
   */
  const handleCreateFolder = useCallback(async (
    options: CreateFolderOptions
  ): Promise<CertificateFolder | null> => {
    if (!userId) return null;

    try {
      setIsLoading(true);
      setError(null);

      const result = await createFolder(userId, options);

      if (result.success && result.folder) {
        // Atualiza lista de pastas
        await loadFolders();
        await loadRootFolders();
        
        return result.folder;
      } else {
        setError(result.error || 'Erro ao criar pasta');
        return null;
      }
    } catch (err) {
      console.error('❌ [useFolders] Erro ao criar pasta:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadFolders, loadRootFolders]);

  /**
   * Atualiza uma pasta existente
   */
  const handleUpdateFolder = useCallback(async (
    folderId: string,
    options: UpdateFolderOptions
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await updateFolder(folderId, options);

      if (result.success) {
        // Atualiza lista de pastas
        await loadFolders();
        await loadRootFolders();
        
        return true;
      } else {
        setError(result.error || 'Erro ao atualizar pasta');
        return false;
      }
    } catch (err) {
      console.error('❌ [useFolders] Erro ao atualizar pasta:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadFolders, loadRootFolders]);

  /**
   * Deleta uma pasta (apenas se estiver vazia)
   */
  const handleDeleteFolder = useCallback(async (folderId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await deleteFolder(folderId);

      if (result.success) {
        // Remove pasta da lista local
        setFolders(prev => prev.filter(f => f.id !== folderId));
        setRootFolders(prev => prev.filter(f => f.id !== folderId));
        
        // Se estava na pasta deletada, volta para root
        if (currentFolder?.id === folderId) {
          setCurrentFolder(null);
        }
        
        return true;
      } else {
        setError(result.error || 'Erro ao deletar pasta');
        return false;
      }
    } catch (err) {
      console.error('❌ [useFolders] Erro ao deletar pasta:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentFolder]);

  /**
   * Move um certificado para uma pasta
   */
  const handleMoveCertificate = useCallback(async (
    contentId: string,
    folderId: string
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      setError(null);

      const result = await moveCertificateToFolder(userId, contentId, folderId);

      if (result.success) {
        return true;
      } else {
        setError(result.error || 'Erro ao mover certificado');
        return false;
      }
    } catch (err) {
      console.error('❌ [useFolders] Erro ao mover certificado:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    }
  }, [userId]);

  /**
   * Remove certificado de qualquer pasta (volta para root)
   */
  const handleRemoveCertificate = useCallback(async (contentId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      setError(null);

      const result = await removeCertificateFromFolder(userId, contentId);

      if (result.success) {
        return true;
      } else {
        setError(result.error || 'Erro ao remover certificado');
        return false;
      }
    } catch (err) {
      console.error('❌ [useFolders] Erro ao remover certificado:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    }
  }, [userId]);

  /**
   * Obtém certificados na pasta atual
   */
  const getCertificatesInCurrentFolder = useCallback(async (): Promise<string[]> => {
    if (!currentFolder) return [];

    try {
      return await getCertificatesInFolder(currentFolder.id);
    } catch (err) {
      console.error('❌ [useFolders] Erro ao buscar certificados:', err);
      return [];
    }
  }, [currentFolder]);

  /**
   * Obtém a pasta de um certificado
   */
  const getFolderForCertificate = useCallback(async (contentId: string): Promise<string | null> => {
    try {
      return await getCertificateFolder(contentId);
    } catch (err) {
      console.error('❌ [useFolders] Erro ao buscar pasta do certificado:', err);
      return null;
    }
  }, []);

  /**
   * Navega para uma pasta específica
   */
  const navigateToFolder = useCallback((folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setCurrentFolder(folder);
    }
  }, [folders]);

  /**
   * Volta para a raiz (todas as pastas)
   */
  const navigateToRoot = useCallback(() => {
    setCurrentFolder(null);
  }, []);

  /**
   * Auto-load ao montar o componente
   */
  useEffect(() => {
    if (autoLoad && userId) {
      loadFolders();
      loadRootFolders();
    }
  }, [autoLoad, userId, loadFolders, loadRootFolders]);

  return {
    folders,
    rootFolders,
    currentFolder,
    isLoading,
    error,
    
    loadFolders,
    loadRootFolders,
    loadSubfolders,
    handleCreateFolder,
    handleUpdateFolder,
    handleDeleteFolder,
    
    handleMoveCertificate,
    handleRemoveCertificate,
    getCertificatesInCurrentFolder,
    getFolderForCertificate,
    
    setCurrentFolder,
    navigateToFolder,
    navigateToRoot,
  };
}