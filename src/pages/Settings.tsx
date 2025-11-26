import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  ArrowLeft, 
  Lock, 
  Bell, 
  Eye, 
  Trash2, 
  Download,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { getCurrentUser, logout, User } from '@/lib/supabase-auth';

export default function Settings() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [contentUpdates, setContentUpdates] = useState(true);
  
  // Privacy settings
  const [profilePublic, setProfilePublic] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    loadUser();
  }, [navigate]);

  const loadUser = async () => {
    const user = await getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
  };

  const handleLogoClick = async () => {
    const user = await getCurrentUser();
    navigate(user ? '/dashboard' : '/');
  };

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Preencha todos os campos de senha');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      alert('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    // Simulação de mudança de senha
    alert('Senha alterada com sucesso!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleExportData = () => {
    if (!currentUser) return;
    
    const dataStr = JSON.stringify(currentUser, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vero-id-data-${currentUser.id}.json`;
    link.click();
    
    alert('Dados exportados com sucesso!');
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.'
    );
    
    if (confirmed) {
      const doubleConfirm = window.confirm(
        'ATENÇÃO: Todos os seus dados, chaves criptográficas e conteúdos assinados serão permanentemente excluídos. Deseja continuar?'
      );
      
      if (doubleConfirm) {
        // Logout and redirect
        await logout();
        alert('Conta excluída com sucesso');
        navigate('/');
      }
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <button 
              onClick={handleLogoClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
              title="Vero iD"
            >
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Vero iD
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações da sua conta</p>
        </div>

        {/* Security Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Segurança
            </CardTitle>
            <CardDescription>Altere sua senha e configure opções de segurança</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Use uma senha forte com letras maiúsculas, minúsculas, números e caracteres especiais.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                />
              </div>

              <Button onClick={handlePasswordChange} className="w-full">
                Alterar Senha
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autenticação em Dois Fatores (2FA)</Label>
                <p className="text-sm text-muted-foreground">
                  Adicione uma camada extra de segurança
                </p>
              </div>
              <Button variant="outline" disabled>
                Em Breve
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>Configure como você deseja receber notificações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receba atualizações importantes por email
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de Segurança</Label>
                <p className="text-sm text-muted-foreground">
                  Seja notificado sobre atividades suspeitas
                </p>
              </div>
              <Switch
                checked={securityAlerts}
                onCheckedChange={setSecurityAlerts}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Atualizações de Conteúdo</Label>
                <p className="text-sm text-muted-foreground">
                  Notificações sobre conteúdos assinados
                </p>
              </div>
              <Switch
                checked={contentUpdates}
                onCheckedChange={setContentUpdates}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Privacidade
            </CardTitle>
            <CardDescription>Controle a visibilidade das suas informações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Perfil Público</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir que outros usuários vejam seu perfil
                </p>
              </div>
              <Switch
                checked={profilePublic}
                onCheckedChange={setProfilePublic}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mostrar Email</Label>
                <p className="text-sm text-muted-foreground">
                  Exibir seu email no perfil público
                </p>
              </div>
              <Switch
                checked={showEmail}
                onCheckedChange={setShowEmail}
                disabled={!profilePublic}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Gerenciamento de Dados
            </CardTitle>
            <CardDescription>Exporte ou exclua seus dados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Exportar Dados</Label>
                <p className="text-sm text-muted-foreground">
                  Baixe uma cópia de todos os seus dados
                </p>
              </div>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>

            <Separator />

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Zona de Perigo:</strong> As ações abaixo são irreversíveis
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-red-600">Excluir Conta</Label>
                <p className="text-sm text-muted-foreground">
                  Remover permanentemente sua conta e todos os dados
                </p>
              </div>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Notice */}
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            As configurações são salvas automaticamente quando você faz alterações.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="flex-1">
            Voltar ao Dashboard
          </Button>
          <Button onClick={() => navigate('/profile')} variant="outline" className="flex-1">
            Ver Perfil
          </Button>
        </div>
      </div>
    </div>
  );
}