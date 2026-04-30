/**
 * 🔄 CAROUSEL INTEGRATION PATCH
 * 
 * This file contains the modifications needed to integrate ImageCarouselUpload
 * into SignContent.tsx. Apply these changes to enable multiple image uploads.
 * 
 * KEY CHANGES:
 * 1. Add carousel-related imports
 * 2. Add carousel state management
 * 3. Replace single file upload with ImageCarouselUpload when contentType === 'image'
 * 4. Handle carousel upload, compression, and storage
 * 5. Pass carousel_metadata to signContent function
 */

// ========================================
// STEP 1: ADD NEW IMPORTS (add after existing imports)
// ========================================
import ImageCarouselUpload from '@/components/ImageCarouselUpload';
import { uploadCarouselImages, moveCarouselToPermanent } from '@/lib/services/carousel-storage-service';
import type { CarouselMetadata } from '@/lib/types/carousel';

// ========================================
// STEP 2: ADD NEW STATE VARIABLES (add after existing useState declarations)
// ========================================
// 🆕 CAROUSEL: Estados para upload múltiplo de imagens
const [carouselFiles, setCarouselFiles] = useState<File[]>([]);
const [carouselMetadata, setCarouselMetadata] = useState<CarouselMetadata | null>(null);
const [isUploadingCarousel, setIsUploadingCarousel] = useState(false);
const [carouselUploadProgress, setCarouselUploadProgress] = useState(0);
const [carouselError, setCarouselError] = useState('');

// ========================================
// STEP 3: ADD CAROUSEL HANDLERS (add after existing handlers)
// ========================================

/**
 * 🆕 CAROUSEL: Handler quando imagens são selecionadas
 */
const handleCarouselImagesSelected = async (files: File[]) => {
  setCarouselError('');
  setCarouselFiles(files);
  
  if (!currentUser) {
    setCarouselError('Usuário não identificado');
    return;
  }

  console.log('📸 [CAROUSEL] Iniciando upload de', files.length, 'imagens...');
  
  setIsUploadingCarousel(true);
  setCarouselUploadProgress(0);

  try {
    // Upload das imagens para temp bucket
    const uploadResult = await uploadCarouselImages(
      files,
      currentUser.id,
      {
        maxImages: 15,
        maxSizePerImage: 10 * 1024 * 1024,
        thumbnailMaxWidth: 800,
        thumbnailMaxHeight: 600,
        thumbnailQuality: 0.7,
      },
      (progress) => {
        setCarouselUploadProgress(progress);
      }
    );

    if (!uploadResult.success || !uploadResult.metadata) {
      throw new Error(uploadResult.error || 'Erro ao fazer upload das imagens');
    }

    console.log('✅ [CAROUSEL] Upload concluído:', uploadResult.metadata);
    setCarouselMetadata(uploadResult.metadata);

  } catch (error) {
    console.error('❌ [CAROUSEL] Erro no upload:', error);
    setCarouselError(error instanceof Error ? error.message : 'Erro desconhecido');
    setCarouselFiles([]);
    setCarouselMetadata(null);
  } finally {
    setIsUploadingCarousel(false);
  }
};

/**
 * 🆕 CAROUSEL: Handler quando imagens são removidas
 */
const handleCarouselImagesCleared = () => {
  setCarouselFiles([]);
  setCarouselMetadata(null);
  setCarouselError('');
  setCarouselUploadProgress(0);
  
  // Também limpa estados antigos de arquivo único
  setUploadedFile(null);
  setFilePreview(null);
  setTempFilePath(null);
  setFileValidationError('');
};

// ========================================
// STEP 4: MODIFY handleSign FUNCTION
// Replace the file metadata section with carousel support
// ========================================

// Inside handleSign(), after validation and before signContent() call:

// 🆕 CAROUSEL: Mover imagens para bucket permanente se houver carrossel
let finalCarouselMetadata: CarouselMetadata | undefined = undefined;

if (contentType === 'image' && carouselMetadata && currentUser) {
  console.log('🔄 [CAROUSEL] Movendo', carouselMetadata.total_images, 'imagens para bucket permanente...');
  
  const moveResult = await moveCarouselToPermanent(carouselMetadata, currentUser.id);
  
  if (!moveResult.success || !moveResult.metadata) {
    alert(`Erro ao mover imagens: ${moveResult.error}`);
    return;
  }
  
  console.log('✅ [CAROUSEL] Imagens movidas com sucesso');
  finalCarouselMetadata = moveResult.metadata;
}

// Then pass finalCarouselMetadata to signContent:
const result = await signContent(
  fullContent,
  keyPair.privateKey,
  keyPair.publicKey,
  currentUser.nomePublico || currentUser.nomeCompleto,
  currentUser.id,
  finalThumbnail || undefined,
  selectedPlatforms,
  fileMetadata, // For non-image files
  creatorSocialLinks,
  allowFileDownload,
  finalCarouselMetadata // 🆕 Pass carousel metadata
);

// ========================================
// STEP 5: MODIFY UPLOAD SECTION IN JSX
// Replace the single file upload section with conditional rendering
// ========================================

/* Replace this section in the JSX:
   
   <div className="space-y-3">
     <Label htmlFor="file-upload">
       03 - Upload do Arquivo (Opcional)
     </Label>
     ...single file upload code...
   </div>

   With this:
*/

<div className="space-y-3">
  <Label htmlFor="file-upload">
    03 - Upload do Arquivo (Opcional - será validado e processado automaticamente)
    {contentType === 'image' && (
      <span className="text-blue-600 font-medium ml-2">
        - Upload múltiplo disponível (até 15 imagens para carrossel)
      </span>
    )}
    {contentType === 'video' && <span className="text-blue-600 font-medium"> - Apenas thumbnail será gerada (vídeo não será enviado)</span>}
  </Label>
  
  {/* 🆕 CAROUSEL: Modo de upload múltiplo para imagens */}
  {contentType === 'image' ? (
    <ImageCarouselUpload
      onImagesSelected={handleCarouselImagesSelected}
      onImagesCleared={handleCarouselImagesCleared}
      maxImages={15}
      maxSizeMB={10}
      isUploading={isUploadingCarousel}
      uploadProgress={carouselUploadProgress}
      error={carouselError}
      disabled={isBlocked || isSigning}
    />
  ) : (
    /* Keep existing single file upload for non-image content types */
    <div className="space-y-3">
      {!uploadedFile && !showCameraCapture ? (
        <>
          {/* ...existing single file upload code... */}
        </>
      ) : (
        /* ...existing file preview code... */
      )}
    </div>
  )}
</div>

// ========================================
// STEP 6: UPDATE handleNewSignature
// Add carousel state cleanup
// ========================================

const handleNewSignature = () => {
  setTitle('');
  setContent('');
  setContentType('text');
  setSelectedPlatforms([]);
  setUploadedFile(null);
  setFilePreview(null);
  setSignedContent(null);
  setFileValidationError('');
  setVideoThumbnail(null);
  setTempFilePath(null);
  setUploadProgress(0);
  setAllowFileDownload(true);
  
  // 🆕 CAROUSEL: Limpar estados de carrossel
  setCarouselFiles([]);
  setCarouselMetadata(null);
  setCarouselError('');
  setCarouselUploadProgress(0);
  setIsUploadingCarousel(false);
};

// ========================================
// STEP 7: UPDATE CONTENT TYPE CHANGE HANDLER
// Clear carousel states when switching content types
// ========================================

// In the contentTypes.map() button onClick:
onClick={() => {
  setContentType(type.value);
  // Limpa arquivo e erro ao mudar tipo
  setUploadedFile(null);
  setFilePreview(null);
  setFileValidationError('');
  setVideoThumbnail(null);
  setTempFilePath(null);
  
  // 🆕 CAROUSEL: Limpar estados de carrossel
  setCarouselFiles([]);
  setCarouselMetadata(null);
  setCarouselError('');
  setCarouselUploadProgress(0);
}}

// ========================================
// STEP 8: UPDATE SIGN BUTTON DISABLED CONDITION
// Consider carousel state
// ========================================

<Button
  onClick={handleSign}
  disabled={
    isSigning || 
    isBlocked || 
    isProcessingVideo || 
    isUploadingFile || 
    isUploadingCarousel || // 🆕 Add carousel upload check
    !title.trim() || 
    selectedPlatforms.length === 0 ||
    (signatureStatus && !signatureStatus.has_active_subscription) ||
    (signatureStatus && signatureStatus.total_available <= 0)
  }
  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
  size="lg"
>
  {isSigning ? (
    <>
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Assinando...
    </>
  ) : isUploadingFile || isUploadingCarousel ? ( // 🆕 Add carousel check
    <>
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Fazendo upload...
    </>
  ) : /* ...rest of conditions... */
</Button>