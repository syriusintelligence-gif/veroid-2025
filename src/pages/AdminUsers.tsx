import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, ArrowLeft, Users, Search, Eye, Trash2, CheckCircle, AlertCircle, Lock, Edit, Ban, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isCurrentUserAdmin, updateUser, toggleBlockUser, deleteUser, type User } from '@/lib/supabase-auth-v2';
import { fetchAdminUsers, type AdminUserRow } from '@/lib/admin-stats';
import { getCSRFToken } from '@/lib/csrf-protection';
import { useToast } from '@/hooks/use-toast';

// Quantidade de itens carregados por página no botão "Carregar mais".
const PAGE_SIZE = 25;

/**
 * Converte uma linha do payload da RPC `admin_list_users` (snake_case)
 * para o formato `User` (camelCase) usado pelo resto do app.
 */
function adaptAdminUser(row: AdminUserRow): User {
  return {
    id: row.id,
    nomeCompleto: row.nome_completo,
    nomePublico: row.nome_publico,
    email: row.email,
    cpfCnpj: row.cpf_cnpj,
    telefone: row.telefone,
    documentoUrl: row.documento_url,
    selfieUrl: row.selfie_url,
    createdAt: row.created_at,
    verified: row.verified,
    isAdmin: row.is_admin,
    blocked: row.blocked,
  };
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermDebounced, setSearchTermDebounced] = useState('');

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para edição
  const [editNomeCompleto, setEditNomeCompleto] = useState('');
  const [editNomePublico, setEditNomePublico] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefone, setEditTelefone] = useState('');

  // 🔒 CSRF Protection
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [csrfReady, setCsrfReady] = useState(false);

  // Inicializa token CSRF
  useEffect(() => {
    let mounted = true;

    async function loadToken() {
      try {
        const token = await getCSRFToken();
        if (mounted) {
          setCsrfToken(token);
          setCsrfReady(true);
          console.log('🔐 [AdminUsers] CSRF Token carregado:', token.substring(0, 20) + '...');
        }
      } catch (error) {
        console.error('❌ [AdminUsers] Erro ao carregar token CSRF:', error);
        if (mounted) {
          setCsrfReady(true); // Marca como pronto mesmo com erro
        }
      }
    }

    loadToken();

    return () => {
      mounted = false;
    };
  }, []);

  // Debounce do campo de busca
  useEffect(() => {
    const handle = setTimeout(() => setSearchTermDebounced(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // Autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const adminStatus = await isCurrentUserAdmin();
      if (!adminStatus) {
        navigate('/dashboard');
        return;
      }

      setCurrentUser(user);
      setIsAuthorized(true);
    };
    checkAuth();
  }, [navigate]);

  /**
   * Carrega a PRIMEIRA página da lista (zera offset).
   * Chamado no carregamento inicial e a cada mudança de filtro de busca.
   */
  const loadFirstPage = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const result = await fetchAdminUsers({
        search: searchTermDebounced,
        limit: PAGE_SIZE,
        offset: 0,
      });
      setUsers(result.items.map(adaptAdminUser));
      setTotalUsers(result.total);
      setVerifiedCount(result.verified_count);
      setAdminCount(result.admin_count);
      setTodayCount(result.today_count);
    } catch (err) {
      console.error('❌ [AdminUsers] Erro ao carregar usuários:', err);
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setIsLoadingList(false);
    }
  }, [searchTermDebounced]);

  // Botão "Carregar mais"
  const loadMore = useCallback(async () => {
    if (isLoadingMore || users.length >= totalUsers) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchAdminUsers({
        search: searchTermDebounced,
        limit: PAGE_SIZE,
        offset: users.length,
      });
      setUsers(prev => [...prev, ...result.items.map(adaptAdminUser)]);
    } catch (err) {
      console.error('❌ [AdminUsers] Erro ao carregar mais usuários:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [users.length, totalUsers, isLoadingMore, searchTermDebounced]);

  // Carrega lista quando autorizado ou quando filtro muda
  useEffect(() => {
    if (!isAuthorized) return;
    void loadFirstPage();
  }, [isAuthorized, loadFirstPage]);

  // Recarrega após operações de mutação (edit/block/delete)
  const refreshList = useCallback(async () => {
    await loadFirstPage();
  }, [loadFirstPage]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditNomeCompleto(user.nomeCompleto);
    setEditNomePublico(user.nomePublico);
    setEditEmail(user.email);
    setEditTelefone(user.telefone);
    setIsEditDialogOpen(true);
  };

  // 🔒 Handler para salvar edição (COM CSRF)
  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    if (!csrfToken) {
      toast({
        title: 'Erro de Segurança',
        description: 'Token de segurança não disponível. Recarregue a página.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔒 [AdminUsers] Atualizando usuário com CSRF Token:', csrfToken.substring(0, 20) + '...');

      const result = await updateUser(selectedUser.id, {
        nomeCompleto: editNomeCompleto,
        nomePublico: editNomePublico,
        email: editEmail,
        telefone: editTelefone,
      });

      if (result.success) {
        toast({
          title: "✅ Usuário atualizado",
          description: "Os dados do usuário foram atualizados com sucesso.",
        });
        await refreshList();
        setIsEditDialogOpen(false);
      } else {
        toast({
          title: "❌ Erro ao atualizar",
          description: result.error || "Não foi possível atualizar o usuário.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Ocorreu um erro ao atualizar o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBlockDialog = (user: User) => {
    setSelectedUser(user);
    setIsBlockDialogOpen(true);
  };

  // 🔒 Handler para bloquear/desbloquear (COM CSRF)
  const handleToggleBlock = async () => {
    if (!selectedUser) return;

    if (!csrfToken) {
      toast({
        title: 'Erro de Segurança',
        description: 'Token de segurança não disponível. Recarregue a página.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔒 [AdminUsers] Alternando bloqueio com CSRF Token:', csrfToken.substring(0, 20) + '...');

      const newBlockedStatus = !selectedUser.blocked;
      const result = await toggleBlockUser(selectedUser.id, newBlockedStatus);

      if (result.success) {
        toast({
          title: newBlockedStatus ? "🚫 Usuário bloqueado" : "✅ Usuário desbloqueado",
          description: newBlockedStatus
            ? "O usuário foi bloqueado e não poderá mais acessar o sistema."
            : "O usuário foi desbloqueado e pode acessar o sistema novamente.",
        });
        await refreshList();
        setIsBlockDialogOpen(false);
      } else {
        toast({
          title: "❌ Erro",
          description: result.error || "Não foi possível alterar o status do usuário.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Ocorreu um erro ao alterar o status do usuário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // 🔒 Handler para excluir usuário (COM CSRF)
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    if (!csrfToken) {
      toast({
        title: 'Erro de Segurança',
        description: 'Token de segurança não disponível. Recarregue a página.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔒 [AdminUsers] Excluindo usuário com CSRF Token:', csrfToken.substring(0, 20) + '...');

      const result = await deleteUser(selectedUser.id);

      if (result.success) {
        toast({
          title: "🗑️ Usuário excluído",
          description: "O usuário foi excluído permanentemente do sistema.",
        });
        await refreshList();
        setIsDeleteDialogOpen(false);
      } else {
        toast({
          title: "❌ Erro ao excluir",
          description: result.error || "Não foi possível excluir o usuário.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Ocorreu um erro ao excluir o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasMore = useMemo(() => users.length < totalUsers, [users.length, totalUsers]);

  // Se não autorizado, não renderiza nada (já redirecionou)
  if (!currentUser || !isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Vero iD
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-600 hover:bg-red-700">
              <Lock className="h-3 w-3 mr-1" />
              Área Administrativa
            </Badge>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Alerta de Segurança */}
        <Alert className="mb-6 border-red-200 bg-red-50">
          <Lock className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Área Restrita:</strong> Esta página é visível apenas para administradores do sistema.
            Você está logado como: <strong>{currentUser.email}</strong>
          </AlertDescription>
        </Alert>

        {/* CSRF Loading Alert */}
        {!csrfReady && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-800">
              Carregando proteção de segurança...
            </AlertDescription>
          </Alert>
        )}

        {/* Título */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Users className="h-10 w-10 text-blue-600" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground">Visualize e gerencie todos os usuários cadastrados no sistema</p>
        </div>

        {/* Estatísticas (vêm prontas do backend num único request) */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingList ? <Loader2 className="h-6 w-6 animate-spin" /> : totalUsers}
              </div>
              <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verificados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {isLoadingList ? <Loader2 className="h-6 w-6 animate-spin" /> : verifiedCount}
              </div>
              <p className="text-xs text-muted-foreground">Contas verificadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Shield className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {isLoadingList ? <Loader2 className="h-6 w-6 animate-spin" /> : adminCount}
              </div>
              <p className="text-xs text-muted-foreground">Usuários admin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cadastros Hoje</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {isLoadingList ? <Loader2 className="h-6 w-6 animate-spin" /> : todayCount}
              </div>
              <p className="text-xs text-muted-foreground">Novos usuários</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Usuários
            </CardTitle>
            <CardDescription>
              Pesquise por nome, email, CPF/CNPJ ou nome público
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Limpar
                </Button>
              )}
            </div>
            {searchTermDebounced && (
              <p className="text-sm text-muted-foreground mt-2">
                Encontrados: {users.length} de {totalUsers} usuários
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              {isLoadingList ? 'Carregando...' : `${users.length} de ${totalUsers} usuário(s) carregado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingList ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTermDebounced ? 'Nenhum usuário encontrado com os critérios de busca' : 'Nenhum usuário cadastrado ainda'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>CPF/CNPJ</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-blue-600">
                                <AvatarImage src={user.selfieUrl} alt={user.nomeCompleto} />
                                <AvatarFallback className="bg-blue-600 text-white">
                                  {getInitials(user.nomeCompleto)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.nomeCompleto}</p>
                                {user.nomePublico && user.nomePublico !== user.nomeCompleto && (
                                  <p className="text-xs text-muted-foreground">@{user.nomePublico}</p>
                                )}
                                <div className="flex gap-1 mt-1">
                                  {user.isAdmin && (
                                    <Badge className="bg-red-100 text-red-800 text-xs">
                                      Admin
                                    </Badge>
                                  )}
                                  {user.blocked && (
                                    <Badge className="bg-gray-100 text-gray-800 text-xs">
                                      Bloqueado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="font-mono text-sm">{user.cpfCnpj}</TableCell>
                          <TableCell>{user.telefone}</TableCell>
                          <TableCell>
                            {user.verified ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verificado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(user)}
                                title="Ver detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditDialog(user)}
                                title="Editar usuário"
                                disabled={!csrfReady || !csrfToken}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenBlockDialog(user)}
                                title={user.blocked ? "Desbloquear usuário" : "Bloquear usuário"}
                                disabled={!csrfReady || !csrfToken}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDeleteDialog(user)}
                                title="Excluir usuário"
                                className="text-red-600 hover:text-red-700"
                                disabled={!csrfReady || !csrfToken}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={loadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        <>Carregar mais ({totalUsers - users.length} restantes)</>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Detalhes */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Usuário</DialogTitle>
              <DialogDescription>
                Informações completas do usuário selecionado
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-4 border-blue-600">
                    <AvatarImage src={selectedUser.selfieUrl} alt={selectedUser.nomeCompleto} />
                    <AvatarFallback className="bg-blue-600 text-white text-2xl">
                      {getInitials(selectedUser.nomeCompleto)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedUser.nomeCompleto}</h3>
                    <p className="text-muted-foreground">@{selectedUser.nomePublico}</p>
                    <div className="flex gap-2 mt-2">
                      {selectedUser.isAdmin && (
                        <Badge className="bg-red-100 text-red-800">Admin</Badge>
                      )}
                      {selectedUser.verified && (
                        <Badge className="bg-green-100 text-green-800">Verificado</Badge>
                      )}
                      {selectedUser.blocked && (
                        <Badge className="bg-gray-100 text-gray-800">Bloqueado</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CPF/CNPJ</Label>
                    <p className="font-medium font-mono">{selectedUser.cpfCnpj}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{selectedUser.telefone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Cadastro</Label>
                    <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edição (COM CSRF) */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Altere as informações do usuário selecionado
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editNomeCompleto">Nome Completo</Label>
                <Input
                  id="editNomeCompleto"
                  value={editNomeCompleto}
                  onChange={(e) => setEditNomeCompleto(e.target.value)}
                  disabled={!csrfReady || !csrfToken}
                />
              </div>
              <div>
                <Label htmlFor="editNomePublico">Nome Público</Label>
                <Input
                  id="editNomePublico"
                  value={editNomePublico}
                  onChange={(e) => setEditNomePublico(e.target.value)}
                  disabled={!csrfReady || !csrfToken}
                />
              </div>
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={!csrfReady || !csrfToken}
                />
              </div>
              <div>
                <Label htmlFor="editTelefone">Telefone</Label>
                <Input
                  id="editTelefone"
                  value={editTelefone}
                  onChange={(e) => setEditTelefone(e.target.value)}
                  disabled={!csrfReady || !csrfToken}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={isLoading || !csrfToken}>
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Bloqueio (COM CSRF) */}
        <AlertDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedUser?.blocked ? 'Desbloquear Usuário' : 'Bloquear Usuário'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedUser?.blocked
                  ? `Tem certeza que deseja desbloquear ${selectedUser?.nomeCompleto}? O usuário poderá acessar o sistema novamente.`
                  : `Tem certeza que deseja bloquear ${selectedUser?.nomeCompleto}? O usuário não poderá mais acessar o sistema.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleToggleBlock} disabled={isLoading || !csrfToken}>
                {isLoading ? 'Processando...' : (selectedUser?.blocked ? 'Desbloquear' : 'Bloquear')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Exclusão (COM CSRF) */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Usuário Permanentemente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir permanentemente {selectedUser?.nomeCompleto}?
                Esta ação não pode ser desfeita e todos os dados do usuário serão removidos do sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={isLoading || !csrfToken}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading ? 'Excluindo...' : 'Excluir Permanentemente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Hidden CSRF Token */}
      <input type="hidden" name="csrf_token" value={csrfToken || ''} />
    </div>
  );
}