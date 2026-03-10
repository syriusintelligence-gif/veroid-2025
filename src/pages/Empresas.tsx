import { useState } from 'react';
import { ArrowLeft, Building2, CheckCircle, Send, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

interface FormData {
  nomeCompleto: string;
  emailCorporativo: string;
  telefone: string;
  nomeEmpresa: string;
  qtdAutenticacoes: string;
}

interface FormErrors {
  nomeCompleto?: string;
  emailCorporativo?: string;
  telefone?: string;
  nomeEmpresa?: string;
  qtdAutenticacoes?: string;
}

export default function Empresas() {
  const [formData, setFormData] = useState<FormData>({
    nomeCompleto: '',
    emailCorporativo: '',
    telefone: '',
    nomeEmpresa: '',
    qtdAutenticacoes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Validação de email corporativo
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validação de telefone brasileiro
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^(\+55\s?)?(\(?\d{2}\)?[\s-]?)?\d{4,5}[\s-]?\d{4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // Formatação de telefone
  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Validação do formulário
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.nomeCompleto || formData.nomeCompleto.length < 3) {
      newErrors.nomeCompleto = 'Nome completo deve ter pelo menos 3 caracteres';
    }

    if (!formData.emailCorporativo || !validateEmail(formData.emailCorporativo)) {
      newErrors.emailCorporativo = 'E-mail corporativo inválido';
    }

    if (!formData.telefone || !validatePhone(formData.telefone)) {
      newErrors.telefone = 'Telefone inválido';
    }

    if (!formData.nomeEmpresa || formData.nomeEmpresa.length < 2) {
      newErrors.nomeEmpresa = 'Nome da empresa deve ter pelo menos 2 caracteres';
    }

    if (!formData.qtdAutenticacoes) {
      newErrors.qtdAutenticacoes = 'Selecione a quantidade estimada';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler de mudança de input
  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === 'telefone') {
      value = formatPhone(value);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpa erro do campo quando usuário começa a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Salvar no banco de dados Supabase
      const { error } = await supabase
        .from('business_leads')
        .insert({
          nome_completo: formData.nomeCompleto,
          email_corporativo: formData.emailCorporativo,
          telefone: formData.telefone,
          nome_empresa: formData.nomeEmpresa,
          qtd_autenticacoes: formData.qtdAutenticacoes,
          status: 'novo',
        });

      if (error) {
        console.error('Erro ao salvar lead:', error);
        throw new Error('Erro ao enviar formulário. Tente novamente.');
      }

      // Sucesso
      setIsSuccess(true);
      setFormData({
        nomeCompleto: '',
        emailCorporativo: '',
        telefone: '',
        nomeEmpresa: '',
        qtdAutenticacoes: '',
      });

    } catch (err) {
      console.error('Erro ao enviar formulário:', err);
      setSubmitError(err instanceof Error ? err.message : 'Erro ao enviar formulário. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o início
        </Link>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full mb-6">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Soluções para{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Empresas e Agências
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            Proteja o conteúdo da sua empresa ou dos seus clientes com autenticação digital em escala.
            Planos personalizados para atender às necessidades do seu negócio.
          </p>
        </div>



        {/* Form Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 shadow-xl">
            {isSuccess ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-6">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Mensagem Enviada com Sucesso!
                </h2>
                <p className="text-gray-300 mb-6">
                  Obrigado pelo seu interesse! Nossa equipe comercial entrará em contato em breve
                  para discutir as melhores soluções para sua empresa.
                </p>
                <Button
                  onClick={() => setIsSuccess(false)}
                  variant="outline"
                  className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
                >
                  Enviar Nova Mensagem
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Fale com Nosso Time Comercial
                  </h2>
                  <p className="text-gray-400">
                    Preencha o formulário abaixo e entraremos em contato para criar uma proposta personalizada.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Nome Completo */}
                  <div className="space-y-2">
                    <Label htmlFor="nomeCompleto" className="text-white">
                      Nome Completo <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="nomeCompleto"
                      type="text"
                      placeholder="Seu nome completo"
                      value={formData.nomeCompleto}
                      onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                      className={`bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500 ${
                        errors.nomeCompleto ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.nomeCompleto && (
                      <p className="text-red-400 text-sm">{errors.nomeCompleto}</p>
                    )}
                  </div>

                  {/* Email Corporativo */}
                  <div className="space-y-2">
                    <Label htmlFor="emailCorporativo" className="text-white">
                      E-mail Corporativo <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="emailCorporativo"
                      type="email"
                      placeholder="seu@empresa.com.br"
                      value={formData.emailCorporativo}
                      onChange={(e) => handleInputChange('emailCorporativo', e.target.value)}
                      className={`bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500 ${
                        errors.emailCorporativo ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.emailCorporativo && (
                      <p className="text-red-400 text-sm">{errors.emailCorporativo}</p>
                    )}
                  </div>

                  {/* Telefone/WhatsApp */}
                  <div className="space-y-2">
                    <Label htmlFor="telefone" className="text-white">
                      Telefone/WhatsApp <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="telefone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange('telefone', e.target.value)}
                      className={`bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500 ${
                        errors.telefone ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.telefone && (
                      <p className="text-red-400 text-sm">{errors.telefone}</p>
                    )}
                  </div>

                  {/* Nome da Empresa/Agência */}
                  <div className="space-y-2">
                    <Label htmlFor="nomeEmpresa" className="text-white">
                      Nome da Empresa/Agência <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="nomeEmpresa"
                      type="text"
                      placeholder="Nome da sua empresa ou agência"
                      value={formData.nomeEmpresa}
                      onChange={(e) => handleInputChange('nomeEmpresa', e.target.value)}
                      className={`bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500 ${
                        errors.nomeEmpresa ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.nomeEmpresa && (
                      <p className="text-red-400 text-sm">{errors.nomeEmpresa}</p>
                    )}
                  </div>

                  {/* Quantidade Estimada de Autenticações */}
                  <div className="space-y-2">
                    <Label htmlFor="qtdAutenticacoes" className="text-white">
                      Qtd. Estimada de Autenticações/Mês <span className="text-red-400">*</span>
                    </Label>
                    <Select
                      value={formData.qtdAutenticacoes}
                      onValueChange={(value) => handleInputChange('qtdAutenticacoes', value)}
                    >
                      <SelectTrigger
                        className={`bg-white/5 border-white/20 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 data-[state=open]:border-cyan-400 data-[state=open]:ring-2 data-[state=open]:ring-cyan-400/50 ${
                          errors.qtdAutenticacoes ? 'border-red-500' : ''
                        } ${formData.qtdAutenticacoes ? 'border-cyan-400 text-cyan-300' : ''}`}
                      >
                        <SelectValue placeholder="Selecione uma opção" className="text-gray-400" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-cyan-500/50 border-2">
                        <SelectItem value="500-1000" className="text-white hover:bg-cyan-500/20 focus:bg-cyan-500/30 focus:text-cyan-300 cursor-pointer">
                          500 a 1.000 autenticações/mês
                        </SelectItem>
                        <SelectItem value="1000-5000" className="text-white hover:bg-cyan-500/20 focus:bg-cyan-500/30 focus:text-cyan-300 cursor-pointer">
                          1.000 a 5.000 autenticações/mês
                        </SelectItem>
                        <SelectItem value="5000+" className="text-white hover:bg-cyan-500/20 focus:bg-cyan-500/30 focus:text-cyan-300 cursor-pointer">
                          Mais de 5.000 autenticações/mês
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.qtdAutenticacoes && (
                      <p className="text-red-400 text-sm">{errors.qtdAutenticacoes}</p>
                    )}
                  </div>

                  {/* Error Message */}
                  {submitError && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                      <p className="text-red-400 text-sm">{submitError}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-6 text-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>

                  <p className="text-gray-500 text-xs text-center">
                    Ao enviar este formulário, você concorda com nossa{' '}
                    <Link to="/privacy" className="text-cyan-400 hover:underline">
                      Política de Privacidade
                    </Link>
                    .
                  </p>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Back to Pricing Link */}
        <div className="text-center mt-8">
          <Link
            to="/pricing"
            className="text-gray-400 hover:text-cyan-400 transition-colors"
          >
            ← Voltar para os planos individuais
          </Link>
        </div>
      </div>
    </div>
  );
}