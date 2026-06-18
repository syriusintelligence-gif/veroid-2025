/**
 * =====================================================
 * VERO iD - SERVIÇO DE GERENCIAMENTO DE PASTAS
 * =====================================================
 * 
 * Serviço para gerenciar pastas de certificados.
 * Todas operações validam RLS e permissões.
 * 
 * @author VeroID Team
 * @version 1.0.0
 * @date 2026-06-18
 */

import { supabase } from '@/lib/supabase';
import type {
  CertificateFolder,
  FolderWithCount,
  CreateFolderOptions,
  UpdateFolderOptions,
  FolderOperationResult,
  FolderListResult,
  MoveCertificateResult,
  FolderBreadcrumb,
} from '@/lib/types/folders';

/**
 * Obtém todas as pastas do usuário
 */
export async function getUserFolders(userId: string): Promise<FolderListResult> {
  try {
    console.log('📁 [FolderService] Buscando pastas do usuário:', userId);

    const { data, error } = await supabase
      .from('certificate_folders')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ [FolderService] Erro ao buscar pastas:', error);
      return { success: false, error: error.message };
    }

    const folders: CertificateFolder[] = (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      parentFolderId: item.parent_folder_id,
      color: item.color,
      icon: item.icon,
      position: item.position,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    console.log('✅ [FolderService] Pastas encontradas:', folders.length);
    return { success: true, folders };
  } catch (error) {
    console.error('❌ [FolderService] Erro inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Obtém pastas de nível raiz (sem pai)
 */
export async function getRootFolders(userId: string): Promise<FolderListResult> {
  try {
    console.log('📁 [FolderService] Buscando pastas raiz do usuário:', userId);

    const { data, error } = await supabase
      .from('certificate_folders')
      .select('*')
      .eq('user_id', userId)
      .is('parent_folder_id', null)
      .order('position', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ [FolderService] Erro ao buscar pastas raiz:', error);
      return { success: false, error: error.message };
    }

    const folders: CertificateFolder[] = (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      parentFolderId: item.parent_folder_id,
      color: item.color,
      icon: item.icon,
      position: item.position,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    console.log('✅ [FolderService] Pastas raiz encontradas:', folders.length);
    return { success: true, folders };
  } catch (error) {
    console.error('❌ [FolderService] Erro inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Obtém subpastas de uma pasta específica
 */
export async function getSubfolders(
  userId: string,
  parentFolderId: string
): Promise<FolderListResult> {
  try {
    console.log('📁 [FolderService] Buscando subpastas de:', parentFolderId);

    const { data, error } = await supabase
      .from('certificate_folders')
      .select('*')
      .eq('user_id', userId)
      .eq('parent_folder_id', parentFolderId)
      .order('position', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ [FolderService] Erro ao buscar subpastas:', error);
      return { success: false, error: error.message };
    }

    const folders: CertificateFolder[] = (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      parentFolderId: item.parent_folder_id,
      color: item.color,
      icon: item.icon,
      position: item.position,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    console.log('✅ [FolderService] Subpastas encontradas:', folders.length);
    return { success: true, folders };
  } catch (error) {
    console.error('❌ [FolderService] Erro inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Cria uma nova pasta
 */
export async function createFolder(
  userId: string,
  options: CreateFolderOptions
): Promise<FolderOperationResult> {
  try {
    console.log('📁 [FolderService] Criando pasta:', options);

    // Validações
    if (!options.name || options.name.trim().length === 0) {
      return { success: false, error: 'Nome da pasta é obrigatório' };
    }

    if (options.name.length > 100) {
      return { success: false, error: 'Nome da pasta muito longo (máximo 100 caracteres)' };
    }

    const { data, error } = await supabase
      .from('certificate_folders')
      .insert({
        user_id: userId,
        name: options.name.trim(),
        parent_folder_id: options.parentFolderId || null,
        color: options.color || '#3B82F6',
        icon: options.icon || '📁',
        position: options.position || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [FolderService] Erro ao criar pasta:', error);
      
      // Trata erro de nome duplicado
      if (error.code === '23505') {
        return { success: false, error: 'Já existe uma pasta com este nome neste local' };
      }
      
      return { success: false, error: error.message };
    }

    const folder: CertificateFolder = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      parentFolderId: data.parent_folder_id,
      color: data.color,
      icon: data.icon,
      position: data.position,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    console.log('✅ [FolderService] Pasta criada:', folder.id);
    return { success: true, folder };
  } catch (error) {
    console.error('❌ [FolderService] Erro inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Atualiza uma pasta existente
 */
export async function updateFolder(
  folderId: string,
  options: UpdateFolderOptions
): Promise<FolderOperationResult> {
  try {
    console.log('📁 [FolderService] Atualizando pasta:', folderId, options);

    const updateData: any = {};

    if (options.name !== undefined) {
      if (options.name.trim().length === 0) {
        return { success: false, error: 'Nome da pasta não pode ser vazio' };
      }
      if (options.name.length > 100) {
        return { success: false, error: 'Nome da pasta muito longo (máximo 100 caracteres)' };
      }
      updateData.name = options.name.trim();
    }

    if (options.color !== undefined) updateData.color = options.color;
    if (options.icon !== undefined) updateData.icon = options.icon;
    if (options.position !== undefined) updateData.position = options.position;

    const { data, error } = await supabase
      .from('certificate_folders')
      .update(updateData)
      .eq('id', folderId)
      .select()
      .single();

    if (error) {
      console.error('❌ [FolderService] Erro ao atualizar pasta:', error);
      
      if (error.code === '23505') {
        return { success: false, error: 'Já existe uma pasta com este nome neste local' };
      }
      
      return { success: false, error: error.message };
    }

    const folder: CertificateFolder = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      parentFolderId: data.parent_folder_id,
      color: data.color,
      icon: data.icon,
      position: data.position,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    console.log('✅ [FolderService] Pasta atualizada:', folder.id);
    return { success: true, folder };
  } catch (error) {
    console.error('❌ [FolderService] Erro inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Deleta uma pasta (apenas se estiver vazia)
 */
export async function deleteFolder(folderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📁 [FolderService] Deletando pasta:', folderId);

    const { error } = await supabase
      .from('certificate_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      console.error('❌ [FolderService] Erro ao deletar pasta:', error);
      
      // Trata erro de pasta não vazia
      if (error.message.includes('folder contains certificates')) {
        return {
          success: false,
          error: 'A pasta contém certificados. Mova ou remova todos os certificados antes de deletar.',
        };
      }
      
      if (error.message.includes('folder contains subfolders')) {
        return {
          success: false,
          error: 'A pasta contém subpastas. Delete ou mova todas as subpastas antes de deletar.',
        };
      }
      
      return { success: false, error: error.message };
    }

    console.log('✅ [FolderService] Pasta deletada:', folderId);
    return { success: true };
  } catch (error) {
    console.error('❌ [FolderService] Erro inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Move um certificado para uma pasta
 */
export async function moveCertificateToFolder(
  userId: string,
  contentId: string,
  folderId: string
): Promise<MoveCertificateResult> {
  try {
    console.log('📁 [FolderService] Movendo certificado:', contentId, 'para pasta:', folderId);

    const { error } = await supabase.rpc('move_certificate_to_folder', {
      p_content_id: contentId,
      p_folder_id: folderId,
      p_user_id: userId,
    });

    if (error) {
      console.error('❌ [FolderService] Erro ao mover certificado:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [FolderService] Certificado movido com sucesso');
    return { success: true };
  } catch (error) {
    console.error('❌ [FolderService] Erro inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Remove certificado de qualquer pasta (volta para root)
 */
export async function removeCertificateFromFolder(
  userId: string,
  contentId: string
): Promise<MoveCertificateResult> {
  try {
    console.log('📁 [FolderService] Removendo certificado da pasta:', contentId);

    const { error } = await supabase.rpc('remove_certificate_from_folder', {
      p_content_id: contentId,
      p_user_id: userId,
    });

    if (error) {
      console.error('❌ [FolderService] Erro ao remover certificado:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [FolderService] Certificado removido da pasta');
    return { success: true };
  } catch (error) {
    console.error('❌ [FolderService] Erro inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Obtém certificados em uma pasta específica
 */
export async function getCertificatesInFolder(folderId: string): Promise<string[]> {
  try {
    console.log('📁 [FolderService] Buscando certificados da pasta:', folderId);

    const { data, error } = await supabase
      .from('certificate_folder_items')
      .select('content_id')
      .eq('folder_id', folderId)
      .order('position', { ascending: true });

    if (error) {
      console.error('❌ [FolderService] Erro ao buscar certificados:', error);
      return [];
    }

    const contentIds = (data || []).map(item => item.content_id);
    console.log('✅ [FolderService] Certificados encontrados:', contentIds.length);
    return contentIds;
  } catch (error) {
    console.error('❌ [FolderService] Erro inesperado:', error);
    return [];
  }
}

/**
 * Obtém a pasta de um certificado
 */
export async function getCertificateFolder(contentId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('certificate_folder_items')
      .select('folder_id')
      .eq('content_id', contentId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.folder_id;
  } catch (error) {
    console.error('❌ [FolderService] Erro ao buscar pasta do certificado:', error);
    return null;
  }
}

/**
 * Obtém o caminho completo de uma pasta (breadcrumb)
 */
export async function getFolderPath(folderId: string): Promise<FolderBreadcrumb[]> {
  try {
    console.log('📁 [FolderService] Obtendo caminho da pasta:', folderId);

    const { data, error } = await supabase.rpc('get_folder_path', {
      folder_uuid: folderId,
    });

    if (error) {
      console.error('❌ [FolderService] Erro ao obter caminho:', error);
      return [];
    }

    // Parse do resultado (formato: "Pasta1 > Pasta2 > Pasta3")
    if (!data || typeof data !== 'string') {
      return [];
    }

    const pathParts = data.split(' > ');
    return pathParts.map((name, index) => ({
      id: index === pathParts.length - 1 ? folderId : '', // Apenas última tem ID real
      name,
    }));
  } catch (error) {
    console.error('❌ [FolderService] Erro inesperado:', error);
    return [];
  }
}