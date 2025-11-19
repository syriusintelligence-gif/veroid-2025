#!/bin/bash

# Script de Deploy para Vercel
# Autor: VeroID Team
# Data: 2024

echo "🚀 Iniciando processo de deploy no Vercel..."
echo ""

# Verifica se Vercel CLI está instalado
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI não está instalado!"
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI instalado com sucesso!"
    echo ""
fi

# Verifica se está logado no Vercel
echo "🔑 Verificando autenticação no Vercel..."
vercel whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Você não está logado no Vercel!"
    echo "🔐 Fazendo login..."
    vercel login
    echo ""
fi

# Limpa builds anteriores
echo "🧹 Limpando builds anteriores..."
rm -rf dist
rm -rf .vercel
echo "✅ Limpeza concluída!"
echo ""

# Instala dependências
echo "📦 Instalando dependências..."
pnpm install
echo "✅ Dependências instaladas!"
echo ""

# Faz o build
echo "🔨 Fazendo build do projeto..."
pnpm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro no build! Verifique os erros acima."
    exit 1
fi
echo "✅ Build concluído com sucesso!"
echo ""

# Deploy para produção
echo "🚀 Fazendo deploy para produção..."
vercel --prod
if [ $? -ne 0 ]; then
    echo "❌ Erro no deploy! Verifique os erros acima."
    exit 1
fi

echo ""
echo "🎉 Deploy concluído com sucesso!"
echo "✅ Seu site está no ar em: https://veroid-2025.vercel.app"
echo ""
echo "📋 Próximos passos:"
echo "1. Acesse o dashboard: https://veroid-2025.vercel.app/dashboard"
echo "2. Gere uma NOVA assinatura"
echo "3. Escaneie o QR Code"
echo "4. Verifique se o certificado abre corretamente!"
echo ""