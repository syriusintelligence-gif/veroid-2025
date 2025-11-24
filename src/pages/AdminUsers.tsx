import { useState, useEffect } from 'react';
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
import { Shield, ArrowLeft, Users, Search, Eye, Trash2, CheckCircle, AlertCircle, FileText, Lock, Edit, Ban, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUsers, getCurrentUser, User, isCurrentUserAdmin, deleteUser, updateUser, blockUser, unblockUser } from '@/lib/supabase-auth';

export default function AdminUsers() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
  
  useEffect(() => {
    checkAuthAndLoadData();
  }, [navigate]);
  
  const checkAuthAndLoadData = async () => {
    // Verifica se usuário está logado
    const user = await getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Verifica se é administrador
    const adminStatus = await isCurrentUserAdmin();
    if (!adminStatus) {
      // Redireciona para dashboard se não for admin
      navigate('/dashboard');
      return;
    }
    
    setCurrentUser(user);
    setIsAuthorized(true);
    
    // Carrega lista de usuários
    await loadUsers();
  };
  
  const loadUsers = async () => {
    const allUsers = await getUsers();
    setUsers(allUsers);
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  const filteredUsers = users.filter(user => 
    user.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.cpfCnpj.includes(searchTerm) ||
    (user.nomePublico && user.nomePublico.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
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
  
  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    
    const result = await updateUser(selectedUser.id, {
      nomeCompleto: editNomeCompleto,
      nomePublico: editNomePublico,
      email: editEmail,
      telefone: editTelefone,
    });
    
    setIsLoading(false);
    
    if (result.success) {
      await loadUsers();
      setIsEditDialogOpen(false);
      alert('Usuário atualizado com sucesso!');
    } else {
      alert(result.error || 'Erro ao atualizar usuário');
    }
  };
  
  const handleOpenBlockDialog = (user: User) => {
    setSelectedUser(user);
    setIsBlockDialogOpen(true);
  };
  
  const handleToggleBlock = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    
    const result = selectedUser.blocked 
      ? await unblockUser(selectedUser.id)
      : await blockUser(selectedUser.id);
    
    setIsLoading(false);
    
    if (result.success) {
      await loadUsers();
      setIsBlockDialogOpen(false);
      alert(selectedUser.blocked ? 'Usuário desbloqueado com sucesso!' : 'Usuário bloqueado com sucesso!');
    } else {
      alert(result.error || 'Erro ao alterar status do usuário');
    }
  };
  
  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    
    const result = await deleteUser(selectedUser.id);
    
    setIsLoading(false);
    
    if (result.success) {
      await loadUsers();
      setIsDeleteDialogOpen(false);
      setIsDialogOpen(false);
      alert('Usuário excluído com sucesso!');
    } else {
      alert(result.error || 'Erro ao excluir usuário');
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
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
        
        {/* Título */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Users className="h-10 w-10 text-blue-600" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground">Visualize e gerencie todos os usuários cadastrados no sistema</p>
        </div>
        
        {/* Estatísticas */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
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
                {users.filter(u => u.verified).length}
              </div>
              <p className="text-xs text-muted-foreground">Contas verificadas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bloqueados</CardTitle>
              <Ban className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {users.filter(u => u.blocked).length}
              </div>
              <p className="text-xs text-muted-foreground">Usuários bloqueados</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cadastros Hoje</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {users.filter(u => {
                  const today = new Date().toDateString();
                  const userDate = new Date(u.createdAt).toDateString();
                  return today === userDate;
                }).length}
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
            {searchTerm && (
              <p className="text-sm text-muted-foreground mt-2">
                Encontrados: {filteredUsers.length} de {users.length} usuários
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Tabela de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              {filteredUsers.length} usuário(s) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhum usuário encontrado com os critérios de busca' : 'Nenhum usuário cadastrado ainda'}
                </p>
              </div>
            ) : (
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
                    {filteredUsers.map((user) => (
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
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            {!user.isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenBlockDialog(user)}
                                  title={user.blocked ? "Desbloquear usuário" : "Bloquear usuário"}
                                >
                                  <Ban className={`h-4 w-4 ${user.blocked ? 'text-green-600' : 'text-orange-600'}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDeleteDialog(user)}
                                  title="Excluir usuário"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Dialog de Detalhes do Usuário */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Usuário</DialogTitle>
              <DialogDescription>
                Informações completas do cadastro
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-6">
                {/* Informações Pessoais */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 border-2 border-blue-600">
                        <AvatarImage src={selectedUser.selfieUrl} alt={selectedUser.nomeCompleto} />
                        <AvatarFallback className="bg-blue-600 text-white text-2xl">
                          {getInitials(selectedUser.nomeCompleto)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xl font-bold">{selectedUser.nomeCompleto}</p>
                        {selectedUser.nomePublico && selectedUser.nomePublico !== selectedUser.nomeCompleto && (
                          <p className="text-muted-foreground">@{selectedUser.nomePublico}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          {selectedUser.verified ? (
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
                          {selectedUser.isAdmin && (
                            <Badge className="bg-red-100 text-red-800">
                              <Lock className="h-3 w-3 mr-1" />
                              Administrador
                            </Badge>
                          )}
                          {selectedUser.blocked && (
                            <Badge className="bg-gray-100 text-gray-800">
                              <Ban className="h-3 w-3 mr-1" />
                              Bloqueado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
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
                        <Label className="text-muted-foreground">ID do Usuário</Label>
                        <p className="font-medium font-mono text-xs">{selectedUser.id}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Data de Cadastro</Label>
                        <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Documentos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Documentos de Verificação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 block">Documento de Identificação</Label>
                        {selectedUser.documentoUrl.startsWith('data:application/pdf') ? (
                          <div className="border rounded-lg p-8 bg-muted/50 text-center">
                            <FileText className="h-16 w-16 text-blue-600 mx-auto mb-2" />
                            <p className="text-sm font-medium">Documento PDF</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => window.open(selectedUser.documentoUrl, '_blank')}
                            >
                              Abrir PDF
                            </Button>
                          </div>
                        ) : (
                          <img
                            src={selectedUser.documentoUrl}
                            alt="Documento"
                            className="w-full rounded-lg border"
                          />
                        )}
                      </div>
                      <div>
                        <Label className="mb-2 block">Selfie de Verificação</Label>
                        <img
                          src={selectedUser.selfieUrl}
                          alt="Selfie"
                          className="w-full rounded-lg border"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Ações */}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Fechar
                  </Button>
                  {!selectedUser.isAdmin && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          handleOpenEditDialog(selectedUser);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          handleOpenBlockDialog(selectedUser);
                        }}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        {selectedUser.blocked ? 'Desbloquear' : 'Bloquear'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setIsDialogOpen(false);
                          handleOpenDeleteDialog(selectedUser);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize as informações do usuário
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nome-completo">Nome Completo</Label>
                  <Input
                    id="edit-nome-completo"
                    value={editNomeCompleto}
                    onChange={(e) => setEditNomeCompleto(e.target.value)}
                    placeholder="Nome completo do usuário"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-nome-publico">Nome Público</Label>
                  <Input
                    id="edit-nome-publico"
                    value={editNomePublico}
                    onChange={(e) => setEditNomePublico(e.target.value)}
                    placeholder="Nome público do usuário"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-telefone">Telefone</Label>
                  <Input
                    id="edit-telefone"
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* AlertDialog de Bloqueio */}
        <AlertDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedUser?.blocked ? 'Desbloquear Usuário?' : 'Bloquear Usuário?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedUser?.blocked ? (
                  <>
                    Você está prestes a <strong>desbloquear</strong> o usuário <strong>{selectedUser?.nomeCompleto}</strong>.
                    <br /><br />
                    O usuário poderá fazer login e usar o sistema normalmente.
                  </>
                ) : (
                  <>
                    Você está prestes a <strong>bloquear</strong> o usuário <strong>{selectedUser?.nomeCompleto}</strong>.
                    <br /><br />
                    O usuário não poderá fazer login no sistema até ser desbloqueado.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleToggleBlock} disabled={isLoading}>
                {isLoading ? 'Processando...' : (selectedUser?.blocked ? 'Desbloquear' : 'Bloquear')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* AlertDialog de Exclusão */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Usuário Permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a <strong className="text-red-600">excluir permanentemente</strong> o usuário <strong>{selectedUser?.nomeCompleto}</strong>.
                <br /><br />
                <strong className="text-red-600">Esta ação não pode ser desfeita!</strong>
                <br /><br />
                Todos os dados do usuário serão removidos do sistema, incluindo:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Informações pessoais</li>
                  <li>Documentos de verificação</li>
                  <li>Conteúdos assinados</li>
                  <li>Histórico de atividades</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteUser} 
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading ? 'Excluindo...' : 'Excluir Permanentemente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
