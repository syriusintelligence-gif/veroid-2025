// Script de teste para verificar dados do carrossel no Supabase
import { supabase } from './lib/supabase';

async function testCarouselData() {
  console.log('🧪 Iniciando teste de dados do carrossel...');
  
  // Buscar um registro com carrossel
  const { data, error } = await supabase
    .from('signed_contents')
    .select('*')
    .gt('total_images', 1)
    .limit(1)
    .single();
  
  if (error) {
    console.error('❌ Erro ao buscar dados:', error);
    return;
  }
  
  console.log('📊 Dados brutos do banco:');
  console.log('- ID:', data.id);
  console.log('- total_images:', data.total_images);
  console.log('- carousel_metadata (tipo):', typeof data.carousel_metadata);
  console.log('- carousel_metadata (valor):', data.carousel_metadata);
  
  if (data.carousel_metadata) {
    if (typeof data.carousel_metadata === 'string') {
      console.log('⚠️  carousel_metadata é STRING - precisa fazer parse');
      try {
        const parsed = JSON.parse(data.carousel_metadata);
        console.log('✅ Parse bem-sucedido:', parsed);
        console.log('- carousel_images:', parsed.carousel_images);
      } catch (e) {
        console.error('❌ Erro no parse:', e);
      }
    } else {
      console.log('✅ carousel_metadata já é objeto:', data.carousel_metadata);
    }
  }
}

testCarouselData();