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
import { Shield, ArrowLeft, Users, Search, Eye, Trash2, CheckCircle, AlertCircle, FileText, Lock, Edit, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isCurrentUserAdmin, getUsers, type User } from '@/lib/supabase-auth-v2';

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
    
    // TODO: Implement updateUser function in supabase-auth-v2.ts
    alert('Funcionalidade de edição será implementada em breve');
    
    setIsLoading(false);
    setIsEditDialogOpen(false);
  };
  
  const handleOpenBlockDialog = (user: User) => {
    setSelectedUser(user);
    setIsBlockDialogOpen(true);
  };
  
  const handleToggleBlock = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    
    // TODO: Implement blockUser/unblockUser functions in supabase-auth-v2.ts
    alert('Funcionalidade de bloqueio será implementada em breve');
    
    setIsLoading(false);
    setIsBlockDialogOpen(false);
  };
  
  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    
    // TODO: Implement deleteUser function in supabase-auth-v2.ts
    alert('Funcionalidade de exclusão será implementada em breve');
    
    setIsLoading(false);
    setIsDeleteDialogOpen(false);
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
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Shield className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {users.filter(u => u.isAdmin).length}
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
      </div>
    </div>
  );
}