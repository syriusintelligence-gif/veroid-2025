/**
 * =====================================================
 * VERO iD - GERENCIADOR DE PASTAS
 * =====================================================
 * 
 * Componente principal para gerenciar pastas de certificados.
 * Inclui sidebar de navegação e diálogo de criar/editar pasta.
 * 
 * @author VeroID Team
 * @version 1.0.0
 * @date 2026-06-18
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Folder, FolderPlus, FolderOpen, Trash2, Edit2, ChevronRight, Home } from 'lucide-react';
import { useFolders } from '@/hooks/useFolders';
import type { CertificateFolder } from '@/lib/types/folders';

interface FolderManagerProps {
  userId: string;
  onFolderSelect?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
}

export default function FolderManager({ userId, onFolderSelect, selectedFolderId }: FolderManagerProps) {
  const {
    rootFolders,
    currentFolder,
    isLoading,
    error,
    handleCreateFolder,
    handleUpdateFolder,
    handleDeleteFolder,
    navigateToFolder,
    navigateToRoot,
    loadSubfolders,
  } = useFolders({ userId, autoLoad: true });

  // Estado do diálogo
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingFolder, setEditingFolder] = useState<CertificateFolder | null>(null);

  // Estados do formulário
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#3B82F6');
  const [folderIcon, setFolderIcon] = useState('📁');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de expansão de subpastas
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [subfolders, setSubfolders] = useState<Map<string, CertificateFolder[]>>(new Map());

  /**
   * Abre diálogo para criar nova pasta
   */
  const handleOpenCreateDialog = () => {
    setDialogMode('create');
    setEditingFolder(null);
    setFolderName('');
    setFolderColor('#3B82F6');
    setFolderIcon('📁');
    setFormError(null);
    setIsDialogOpen(true);
  };

  /**
   * Abre diálogo para editar pasta
   */
  const handleOpenEditDialog = (folder: CertificateFolder) => {
    setDialogMode('edit');
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderColor(folder.color);
    setFolderIcon(folder.icon);
    setFormError(null);
    setIsDialogOpen(true);
  };

  /**
   * Salva pasta (criar ou editar)
   */
  const handleSaveFolder = async () => {
    try {
      setFormError(null);
      setIsSubmitting(true);

      // Validações
      if (!folderName.trim()) {
        setFormError('Nome da pasta é obrigatório');
        return;
      }

      if (folderName.length > 100) {
        setFormError('Nome muito longo (máximo 100 caracteres)');
        return;
      }

      if (dialogMode === 'create') {
        // Criar nova pasta
        const result = await handleCreateFolder({
          name: folderName.trim(),
          color: folderColor,
          icon: folderIcon,
          parentFolderId: currentFolder?.id || null,
        });

        if (result) {
          setIsDialogOpen(false);
        } else {
          setFormError('Erro ao criar pasta. Verifique se já existe uma pasta com este nome.');
        }
      } else if (dialogMode === 'edit' && editingFolder) {
        // Editar pasta existente
        const success = await handleUpdateFolder(editingFolder.id, {
          name: folderName.trim(),
          color: folderColor,
          icon: folderIcon,
        });

        if (success) {
          setIsDialogOpen(false);
        } else {
          setFormError('Erro ao atualizar pasta.');
        }
      }
    } catch (err) {
      console.error('❌ Erro ao salvar pasta:', err);
      setFormError('Erro inesperado ao salvar pasta');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Deleta uma pasta
   */
  const handleDelete = async (folder: CertificateFolder) => {
    if (!confirm(`Tem certeza que deseja deletar a pasta "${folder.name}"?\n\nATENÇÃO: A pasta deve estar vazia (sem certificados e sem subpastas).`)) {
      return;
    }

    const success = await handleDeleteFolder(folder.id);

    if (!success) {
      alert('Não foi possível deletar a pasta.\n\nCertifique-se de que ela está vazia (sem certificados e sem subpastas).');
    }
  };

  /**
   * Seleciona uma pasta
   */
  const handleSelectFolder = (folderId: string | null) => {
    if (folderId) {
      navigateToFolder(folderId);
    } else {
      navigateToRoot();
    }
    
    if (onFolderSelect) {
      onFolderSelect(folderId);
    }
  };

  /**
   * Expande/colapsa subpastas
   */
  const handleToggleExpand = async (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    
    if (expandedFolders.has(folderId)) {
      // Colapsar
      newExpanded.delete(folderId);
    } else {
      // Expandir - carregar subpastas
      newExpanded.add(folderId);
      
      if (!subfolders.has(folderId)) {
        const subs = await loadSubfolders(folderId);
        setSubfolders(new Map(subfolders).set(folderId, subs));
      }
    }
    
    setExpandedFolders(newExpanded);
  };

  /**
   * Renderiza item de pasta
   */
  const renderFolderItem = (folder: CertificateFolder, level: number = 0) => {
    const isSelected = selectedFolderId === folder.id;
    const isExpanded = expandedFolders.has(folder.id);
    const folderSubfolders = subfolders.get(folder.id) || [];

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
          style={{ paddingLeft: `${12 + level * 20}px` }}
        >
          {/* Botão de expandir (se tiver subpastas) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpand(folder.id);
            }}
            className="p-0 hover:opacity-70"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          </button>

          {/* Ícone e nome da pasta */}
          <div
            onClick={() => handleSelectFolder(folder.id)}
            className="flex items-center gap-2 flex-1"
          >
            <span className="text-lg">{folder.icon}</span>
            <span className="text-sm font-medium truncate">{folder.name}</span>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditDialog(folder);
              }}
              className="p-1 hover:bg-accent rounded"
              title="Editar pasta"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(folder);
              }}
              className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded"
              title="Deletar pasta"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Subpastas (recursivo) */}
        {isExpanded && folderSubfolders.length > 0 && (
          <div className="ml-2">
            {folderSubfolders.map(subfolder => renderFolderItem(subfolder, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg">Pastas</h3>
        <Button
          size="sm"
          onClick={handleOpenCreateDialog}
          disabled={isLoading}
        >
          <FolderPlus className="h-4 w-4 mr-2" />
          Nova Pasta
        </Button>
      </div>

      {/* Erro global */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Lista de pastas */}
      {!isLoading && (
        <div className="flex-1 overflow-y-auto p-2">
          {/* Botão "Todos" (Root) */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer mb-2 transition-colors ${
              selectedFolderId === null
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
            onClick={() => handleSelectFolder(null)}
          >
            <Home className="h-4 w-4" />
            <span className="text-sm font-medium">Todos os Certificados</span>
          </div>

          {/* Pastas raiz */}
          <div className="space-y-1 group">
            {rootFolders.map(folder => renderFolderItem(folder, 0))}
          </div>

          {/* Mensagem se não houver pastas */}
          {rootFolders.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma pasta criada.</p>
              <p className="text-xs mt-1">Clique em "Nova Pasta" para começar.</p>
            </div>
          )}
        </div>
      )}

      {/* Dialog de Criar/Editar Pasta */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Nova Pasta' : 'Editar Pasta'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? 'Crie uma nova pasta para organizar seus certificados.'
                : 'Atualize as informações da pasta.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nome da pasta */}
            <div className="space-y-2">
              <Label htmlFor="folder-name">Nome da Pasta *</Label>
              <Input
                id="folder-name"
                placeholder="Ex: Projetos 2024"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                maxLength={100}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {folderName.length}/100 caracteres
              </p>
            </div>

            {/* Ícone */}
            <div className="space-y-2">
              <Label htmlFor="folder-icon">Ícone (Emoji)</Label>
              <Input
                id="folder-icon"
                placeholder="📁"
                value={folderIcon}
                onChange={(e) => setFolderIcon(e.target.value)}
                maxLength={10}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Sugestões: 📁 📂 🗂️ 📋 📊 💼 🎯 ⭐
              </p>
            </div>

            {/* Cor */}
            <div className="space-y-2">
              <Label htmlFor="folder-color">Cor</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="folder-color"
                  type="color"
                  value={folderColor}
                  onChange={(e) => setFolderColor(e.target.value)}
                  className="w-20 h-10"
                  disabled={isSubmitting}
                />
                <Input
                  value={folderColor}
                  onChange={(e) => setFolderColor(e.target.value)}
                  placeholder="#3B82F6"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Erro do formulário */}
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveFolder}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                dialogMode === 'create' ? 'Criar Pasta' : 'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}