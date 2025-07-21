import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Camera, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import vetCamLogo from '@/assets/vetcam-logo.png';
interface AnalysisResult {
  animalType: string;
  generalHealth: string;
  positiveAspects: string[];
  concernAreas: string[];
  recommendations: string[];
}
const Downsell = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const apiKey = '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';
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const {
    toast
  } = useToast();
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "Por favor, selecione uma imagem menor que 10MB.",
          variant: "destructive"
        });
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onload = e => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, [toast]);
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  const analyzeImage = async () => {
    if (!image) {
      toast({
        title: "Imagem necessária",
        description: "Por favor, adicione uma imagem antes de analisar.",
        variant: "destructive"
      });
      return;
    }
    setIsAnalyzing(true);
    try {
      const base64Image = await convertToBase64(image);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-2025-04-14",
          messages: [{
            role: "system",
            content: `Você é o VetCam, um especialista em avaliação visual de saúde de cães e gatos. Analise a imagem do animal e retorne APENAS um JSON válido com esta estrutura exata:
              {
                "animalType": "cão" ou "gato",
                "generalHealth": "descrição do estado geral em uma frase",
                "positiveAspects": ["aspecto positivo 1", "aspecto positivo 2"],
                "concernAreas": ["ponto de atenção 1", "ponto de atenção 2"],
                "recommendations": ["recomendação 1", "recomendação 2"]
              }
              
              Primeiro identifique se é um cão ou gato. Depois analise: olhos, pelagem, postura corporal, expressão facial, nariz e boca. Para gatos, observe também orelhas e bigodes. Use linguagem empática e amigável. NUNCA dê diagnóstico clínico, sempre recomende consulta veterinária para sintomas preocupantes.`
          }, {
            role: "user",
            content: [{
              type: "text",
              text: "Por favor, analise a saúde visual deste animal (cão ou gato)."
            }, {
              type: "image_url",
              image_url: {
                url: base64Image
              }
            }]
          }],
          max_tokens: 500
        })
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Resposta da API:', response.status, errorData);
        let errorMessage = `Erro na API: ${response.status}`;
        if (response.status === 429) {
          errorMessage = "Quota da API excedida. Para contas novas: 1) Verifique se adicionou créditos em billing.openai.com 2) APIs novas podem ter limites baixos inicialmente.";
        } else if (response.status === 401) {
          errorMessage = "Chave da API inválida. Verifique se está correta e se tem permissões para modelos de visão.";
        } else if (response.status === 400) {
          errorMessage = "Requisição inválida. Verifique a imagem enviada.";
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      try {
        const parsedAnalysis = JSON.parse(analysisText);
        setAnalysis(parsedAnalysis);
        toast({
          title: "Análise concluída! 🐕🐱",
          description: "Confira o relatório de saúde visual do seu pet."
        });
      } catch (e) {
        throw new Error('Erro ao processar resposta da análise');
      }
    } catch (error) {
      console.error('Erro na análise:', error);
      toast({
        title: "Erro na análise",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: {
            ideal: 1280
          },
          height: {
            ideal: 720
          }
        }
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (error) {
      console.error('Erro ao abrir câmera:', error);
      toast({
        title: "Erro na câmera",
        description: "Não foi possível acessar a câmera. Verifique as permissões.",
        variant: "destructive"
      });
    }
  };
  const capturePhoto = () => {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    if (!video || !stream) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'photo.jpg', {
          type: 'image/jpeg'
        });
        setImage(file);
        setImagePreview(canvas.toDataURL());
        setAnalysis(null);
        closeCamera();
        toast({
          title: "Foto capturada! 📸",
          description: "Imagem pronta para análise."
        });
      }
    }, 'image/jpeg', 0.8);
  };
  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };
  return <div className="min-h-screen bg-gradient-mesh relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary-glow rounded-full mix-blend-multiply filter blur-3xl animate-float opacity-40"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-secondary rounded-full mix-blend-multiply filter blur-3xl animate-float opacity-30" style={{
        animationDelay: '2s'
      }}></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-accent rounded-full mix-blend-multiply filter blur-3xl animate-float opacity-35" style={{
        animationDelay: '4s'
      }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="mb-8">
            <h1 className="text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%] bg-[linear-gradient(110deg,hsl(var(--primary)),45%,hsl(var(--primary-glow)),55%,hsl(var(--primary)))] mb-8">
              🚨 ÚLTIMA CHANCE! Teste GRÁTIS o VetCam e Proteja Seu Pet Agora! 🚨
            </h1>
            
            {/* Logo and Brand Info */}
            <div className="flex items-center justify-center gap-6 mb-8">
              <div className="relative">
                <img src={vetCamLogo} alt="VetCam Logo" className="w-20 h-20 object-contain drop-shadow-glow animate-float" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-primary rounded-full animate-pulse shadow-glow"></div>
              </div>
              <div className="text-center">
                <h2 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  VetCam
                </h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-orange-400 text-xl">⭐</span>
                  <span className="text-orange-400 text-xl">⭐</span>
                  <span className="text-orange-400 text-xl">⭐</span>
                  <span className="text-orange-400 text-xl">⭐</span>
                  <span className="text-orange-400 text-xl">⭐</span>
                  <span className="text-sm text-muted-foreground ml-2">5.0 • Trusted by 10k+ vets</span>
                </div>
              </div>
            </div>
            
            <p className="text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
              ✨ Especialista em avaliação visual de saúde de cães e gatos com tecnologia avançada
            </p>
            
            {/* Features badges */}
            <div className="flex flex-wrap justify-center gap-4">
              <div className="px-6 py-3 text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full shadow-soft hover:shadow-glow transition-all duration-300 backdrop-blur-sm">
                <span className="mr-2">🧠</span>
                IA Avançada
              </div>
              <div className="px-6 py-3 text-sm font-medium bg-red-500/20 text-red-300 border border-red-400/30 rounded-full shadow-soft hover:shadow-glow transition-all duration-300 backdrop-blur-sm">
                <span className="mr-2">❤️</span>
                Análise Instantânea
              </div>
              <div className="px-6 py-3 text-sm font-medium bg-green-500/20 text-green-300 border border-green-400/30 rounded-full shadow-soft hover:shadow-glow transition-all duration-300 backdrop-blur-sm">
                <span className="mr-2">🛡️</span>
                100% Seguro
              </div>
              <div className="px-6 py-3 text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-full shadow-soft hover:shadow-glow transition-all duration-300 backdrop-blur-sm">
                <span className="mr-2">📊</span>
                Relatório Detalhado
              </div>
            </div>
          </div>
        </div>

        {/* Upload Card */}
        <div className="max-w-3xl mx-auto mb-12">
          <Card className="backdrop-blur-xl bg-card/90 border border-border/60 shadow-float hover:shadow-glow transition-all duration-500 animate-slide-up relative overflow-hidden">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-primary shadow-glow">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                Enviar Foto do Pet
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-8 pb-10">
              {/* Upload area */}
              <div className="relative group">
                {imagePreview ? <div className="space-y-6 text-center">
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="Preview" className="max-w-full max-h-80 mx-auto rounded-2xl shadow-float border border-border/30" />
                    </div>
                    <Button onClick={() => {
                  setImage(null);
                  setImagePreview(null);
                  setAnalysis(null);
                }} variant="outline" className="bg-card/80 backdrop-blur-sm hover:bg-primary-light/20 border-border/30">
                      <Upload className="w-4 h-4 mr-2" />
                      Trocar Imagem
                    </Button>
                  </div> : <div className="relative">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="border-3 border-dashed border-border/70 rounded-2xl p-16 text-center hover:border-primary/60 transition-all duration-500 bg-gradient-soft hover:bg-primary-light/30 group-hover:scale-[1.02]">
                      <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-6 group-hover:text-primary transition-all duration-300 group-hover:scale-110" />
                      <p className="text-xl text-muted-foreground group-hover:text-foreground transition-colors font-medium mb-2">
                        Clique ou arraste uma imagem aqui
                      </p>
                      <p className="text-sm text-muted-foreground">
                        JPG, PNG até 10MB
                      </p>
                    </div>
                  </div>}
              </div>

              {/* Action buttons */}
              <div className="flex gap-4">
                <Button onClick={analyzeImage} disabled={!image || isAnalyzing} className="flex-1 h-16 text-xl font-semibold bg-gradient-primary hover:shadow-glow hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isAnalyzing ? <>
                      <div className="animate-spin rounded-full h-6 w-6 border-3 border-primary-foreground border-t-transparent mr-4"></div>
                      Analisando...
                    </> : <>
                      <Eye className="w-6 h-6 mr-4" />
                      Analisar Pet
                    </>}
                </Button>
                
                <Button onClick={openCamera} variant="outline" className="h-16 px-8 bg-card/80 backdrop-blur-sm hover:bg-primary-light/20 border-border/30">
                  <Camera className="w-6 h-6 mr-2" />
                  Câmera
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Camera Dialog */}
        {showCamera && <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-card rounded-2xl p-6 max-w-2xl w-full mx-4">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">Câmera</h3>
                <p className="text-muted-foreground">Posicione seu pet na tela e clique em capturar</p>
              </div>
              
              <div className="relative mb-6">
                <video id="camera-video" autoPlay playsInline ref={video => {
              if (video && stream) {
                video.srcObject = stream;
              }
            }} className="w-full rounded-lg" />
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button onClick={capturePhoto} className="bg-gradient-primary">
                  <Camera className="w-5 h-5 mr-2" />
                  Capturar Foto
                </Button>
                <Button onClick={closeCamera} variant="outline">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>}

        {/* Analysis Result - Same animation as main page with blur overlay */}
        {analysis && <div className="max-w-4xl mx-auto">
            <Card className="backdrop-blur-xl bg-card/90 border border-border/60 shadow-float animate-fade-in mb-8 relative">
              {/* Blur overlay */}
              <div className="absolute inset-0 backdrop-blur-lg bg-card/30 rounded-xl z-10 flex items-center justify-center">
                <div className="text-center p-8">
                  <h3 className="text-3xl font-bold text-foreground mb-4">
                    Garanta seu acesso vitalício VetCam com uma última chance!
                  </h3>
                  <p className="text-lg text-muted-foreground mb-4">
                    E desbloqueie acesso completo ao relatório
                  </p>
                  <p className="text-xl text-muted-foreground mb-8">
                    De <span className="line-through">R$ 127</span> por <span className="text-primary font-bold text-2xl">R$ 97</span>
                  </p>
                  <p className="text-lg text-muted-foreground mb-8">
                    Somente nesta página!
                  </p>
                  
                  {/* Updated Cakto buttons */}
                  <div dangerouslySetInnerHTML={{
                __html: `
                      <div>
                        <meta charset="UTF-8">
                        <cakto-upsell-buttons>
                          <cakto-upsell-accept
                            bg-color="#12b635ff"
                            text-color="#ffffff"
                            upsell-accept-url="https://main.d2h7kps3h58nqo.amplifyapp.com/"
                            offer-id="svb7uz2"
                            app-base-url="https://app.cakto.com.br"
                            offer-type="upsell"
                            upsell-reject-url="https://main.dw9qjxwjpmbex.amplifyapp.com/"   
                          >
                            Sim, quero o VetCam agora
                          </cakto-upsell-accept>
                          <cakto-upsell-reject
                            upsell-reject-url="https://main.dw9qjxwjpmbex.amplifyapp.com/"       
                          >
                            Não quero saber da saúde do meu Pet em tempo real
                          </cakto-upsell-reject>
                        </cakto-upsell-buttons>  
                        
                        <!-- Descomente o código abaixo para estilzar o css dos botões -->
                        <!-- <style>
                            /* Botão de aceitar upsell */
                            cakto-upsell-accept::part(button) {
                                background-color: red;
                                color: white;
                                /* Ajuste do tamanho do botão 
                                Descomente o código abaixo para definir um tamanho customizado para o botão */
                                /* width: 100vw; */
                            }

                            /* Botão de rejeitar upsell */
                            cakto-upsell-reject::part(button) {
                                background-color: blue;
                                color: white;
                            }
                        </style> -->

                        <script type="text/javascript" src="https://caktoscripts.nyc3.cdn.digitaloceanspaces.com/upsell.js"></script>
                      </div>
                    `
              }} />
                </div>
              </div>

              {/* Normal content underneath (will be blurred) */}
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-foreground flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-primary shadow-glow">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                    Relatório de Saúde Visual
                  </div>
                  <div className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-full shadow-soft">
                    <span className="text-sm font-medium">✓ Análise Concluída</span>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-8">
                {/* Danger Alert in Red */}
                <div className="p-6 rounded-2xl bg-red-500 text-white shadow-float relative overflow-hidden border-2 border-red-600">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-transparent"></div>
                  <div className="relative z-10">
                    <h3 className="font-bold mb-4 flex items-center gap-3 text-2xl">
                      <span className="text-3xl animate-pulse">⚠️</span>
                      PERIGO
                    </h3>
                    <p className="text-white text-lg font-semibold leading-relaxed">Isso pode custar a vida do seu pet, veja o relatório abaixo!</p>
                  </div>
                </div>
                {/* Enhanced General Health */}
                <div className="p-8 rounded-2xl bg-gradient-primary text-white shadow-float relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <div className="relative z-10">
                    
                    
                  </div>
                </div>

                {/* Enhanced sections grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Positive Aspects */}
                  {analysis.positiveAspects.length > 0 && <Card className="bg-green-50/80 border-green-200/50 shadow-soft backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-green-800 mb-4 flex items-center gap-3 text-lg">
                          <span className="text-green-500">✓</span>
                          Aspectos Positivos
                        </h3>
                        <ul className="space-y-3">
                          {analysis.positiveAspects.map((aspect, index) => <li key={index} className="text-green-700 flex items-start gap-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="leading-relaxed">{aspect}</span>
                            </li>)}
                        </ul>
                      </CardContent>
                    </Card>}

                  {/* Concern Areas */}
                  {analysis.concernAreas.length > 0 && <Card className="bg-amber-50/80 border-amber-200/50 shadow-soft backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-3 text-lg">
                          <span className="text-amber-500">⚠</span>
                          Pontos de Atenção
                        </h3>
                        <ul className="space-y-3">
                          {analysis.concernAreas.map((concern, index) => <li key={index} className="text-amber-700 flex items-start gap-3">
                              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="leading-relaxed">{concern}</span>
                            </li>)}
                        </ul>
                      </CardContent>
                    </Card>}

                </div>

                {/* Enhanced disclaimer */}
                <Card className="bg-muted/30 border-border/30 shadow-inner backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-destructive/10 rounded-lg">
                        <span className="text-destructive text-xl">⚠</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Importante</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          Esta análise é baseada apenas em aspectos visuais. Para um diagnóstico completo e preciso, 
                          sempre consulte um veterinário qualificado.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>}
      </div>
    </div>;
};
export default Downsell;
