import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Camera, Eye, Heart, AlertCircle, CheckCircle, Sparkles, Star, Users, Award, Zap, Shield, Phone, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import vetCamLogo from '@/assets/vetcam-logo.png';

interface AnalysisResult {
  animalType: string;
  generalHealth: string;
  positiveAspects: string[];
  concernAreas: string[];
  recommendations: string[];
}

const HealthAnalyzer = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const apiKey = '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';
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Support states
  const [supportData, setSupportData] = useState({ phone: '', help: '' });
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  
  // Refund states
  const [refundData, setRefundData] = useState({ email: '', reason: '' });
  const [refundSubmitted, setRefundSubmitted] = useState(false);
  
  const { toast } = useToast();

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
      reader.onload = (e) => setImagePreview(e.target?.result as string);
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
          messages: [
            {
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
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Por favor, analise a saúde visual deste animal (cão ou gato)."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            }
          ],
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
          width: { ideal: 1280 },
          height: { ideal: 720 }
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
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
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

  const handleSupportSubmit = () => {
    if (!supportData.phone || !supportData.help) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }
    setSupportSubmitted(true);
  };

  const handleRefundSubmit = () => {
    if (!refundData.email || !refundData.reason) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }
    setRefundSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-mesh relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary-glow rounded-full mix-blend-multiply filter blur-3xl animate-float opacity-40"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-secondary rounded-full mix-blend-multiply filter blur-3xl animate-float opacity-30" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-accent rounded-full mix-blend-multiply filter blur-3xl animate-float opacity-35" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-1/2 left-10 w-60 h-60 bg-primary-light rounded-full mix-blend-multiply filter blur-2xl animate-float opacity-25" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-secondary-light rounded-full mix-blend-multiply filter blur-2xl animate-float opacity-30" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary-glow rounded-full opacity-20 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Premium Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="relative">
              <img 
                src={vetCamLogo} 
                alt="VetCam Logo" 
                className="w-20 h-20 object-contain drop-shadow-glow animate-float"
              />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-primary rounded-full animate-pulse shadow-glow"></div>
            </div>
            <div className="text-center">
              <h1 className="text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%] bg-[linear-gradient(110deg,hsl(var(--primary)),45%,hsl(var(--primary-glow)),55%,hsl(var(--primary)))]">
                VetCam
              </h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Star className="w-5 h-5 text-secondary fill-current" />
                <Star className="w-5 h-5 text-secondary fill-current" />
                <Star className="w-5 h-5 text-secondary fill-current" />
                <Star className="w-5 h-5 text-secondary fill-current" />
                <Star className="w-5 h-5 text-secondary fill-current" />
                <span className="text-sm text-muted-foreground ml-2">5.0 • Trusted by 10k+ vets</span>
              </div>
            </div>
          </div>
          
          <p className="text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
            ✨ Especialista em avaliação visual de saúde de cães e gatos com tecnologia avançada
          </p>
          
          {/* Premium features badges */}
          <div className="flex flex-wrap justify-center gap-4 mt-10">
            <Badge variant="secondary" className="px-6 py-3 text-sm font-medium bg-primary-light/60 text-primary border-primary/30 shadow-soft hover:shadow-glow transition-all duration-300 backdrop-blur-sm">
              <Sparkles className="w-5 h-5 mr-2" />
              IA Avançada
            </Badge>
            <Badge variant="secondary" className="px-6 py-3 text-sm font-medium bg-secondary-light/60 text-secondary border-secondary/30 shadow-soft hover:shadow-glow transition-all duration-300 backdrop-blur-sm">
              <Heart className="w-5 h-5 mr-2" />
              Análise Instantânea
            </Badge>
            <Badge variant="secondary" className="px-6 py-3 text-sm font-medium bg-accent-light/60 text-accent border-accent/30 shadow-soft hover:shadow-glow transition-all duration-300 backdrop-blur-sm">
              <Shield className="w-5 h-5 mr-2" />
              100% Seguro
            </Badge>
            <Badge variant="secondary" className="px-6 py-3 text-sm font-medium bg-gradient-soft/60 text-foreground border-border/30 shadow-soft hover:shadow-glow transition-all duration-300 backdrop-blur-sm">
              <Award className="w-5 h-5 mr-2" />
              Relatório Detalhado
            </Badge>
          </div>
        </div>

        {/* Premium Upload Card */}
        <div className="max-w-3xl mx-auto mb-12">
          <Card className="backdrop-blur-xl bg-card/90 border border-border/60 shadow-float hover:shadow-glow transition-all duration-500 animate-slide-up relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shimmer"></div>
            
            <CardHeader className="text-center pb-8 relative">
              <CardTitle className="text-3xl font-bold text-foreground flex items-center justify-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-primary shadow-glow">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                Enviar Foto do Pet (Cão ou Gato)
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-8 pb-10">
              {/* Enhanced upload area */}
              <div className="relative group">
                {imagePreview ? (
                  <div className="space-y-6 text-center">
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-full max-h-80 mx-auto rounded-2xl shadow-float border border-border/30"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>
                    <Button
                      onClick={() => {
                        setImage(null);
                        setImagePreview(null);
                        setAnalysis(null);
                      }}
                      variant="outline"
                      className="bg-card/80 backdrop-blur-sm hover:bg-primary-light/20 border-border/30"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Trocar Imagem
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-3 border-dashed border-border/70 rounded-2xl p-16 text-center hover:border-primary/60 transition-all duration-500 bg-gradient-soft hover:bg-primary-light/30 group-hover:scale-[1.02] relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative z-10">
                        <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-6 group-hover:text-primary transition-all duration-300 group-hover:scale-110" />
                        <p className="text-xl text-muted-foreground group-hover:text-foreground transition-colors font-medium mb-2">
                          Clique ou arraste uma imagem aqui
                        </p>
                        <p className="text-sm text-muted-foreground">
                          JPG, PNG até 10MB • Aceita cães e gatos • Para melhor análise, use boa iluminação
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced action buttons */}
              <div className="flex gap-4">
                <Button 
                  onClick={analyzeImage}
                  disabled={!image || isAnalyzing}
                  className="flex-1 h-16 text-xl font-semibold bg-gradient-primary hover:shadow-glow hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-3 border-primary-foreground border-t-transparent mr-4"></div>
                      Analisando com IA...
                    </>
                  ) : (
                    <>
                      <Zap className="w-6 h-6 mr-4 group-hover:animate-pulse" />
                      Analisar Saúde Visual
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={openCamera}
                  variant="outline"
                  className="w-20 h-16 border-primary/30 hover:border-primary hover:bg-primary-light/20 transition-all duration-300 backdrop-blur-sm group"
                  title="Tirar foto"
                >
                  <Camera className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
                </Button>
              </div>

              {/* Enhanced analysis progress */}
              {isAnalyzing && (
                <Card className="bg-gradient-card border border-border/40 shadow-inner animate-scale-in backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      {[
                        { text: "Processando imagem com IA...", delay: "0s", width: "25%" },
                        { text: "Analisando características físicas...", delay: "0.5s", width: "50%" },
                        { text: "Verificando sinais visuais...", delay: "1s", width: "75%" },
                        { text: "Gerando relatório detalhado...", delay: "1.5s", width: "100%" }
                      ].map((step, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div 
                            className="w-4 h-4 bg-gradient-primary rounded-full animate-pulse shadow-glow" 
                            style={{ animationDelay: step.delay }}
                          ></div>
                          <span className="text-base text-muted-foreground font-medium flex-1">{step.text}</span>
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-primary animate-pulse rounded-full transition-all duration-1000"
                              style={{ 
                                width: step.width,
                                animationDelay: step.delay 
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Analysis Results */}
        {analysis && (
          <div className="max-w-4xl mx-auto">
            <Card className="backdrop-blur-xl bg-card/90 border border-border/60 shadow-float animate-fade-in mb-8">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-foreground flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-primary shadow-glow">
                      <Heart className="w-8 h-8 text-white" />
                    </div>
                    Relatório de Saúde Visual
                  </div>
                  <Badge variant="outline" className="px-4 py-2 bg-green-50 text-green-700 border-green-200 shadow-soft">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Análise Concluída
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-8">
                {/* Enhanced General Health */}
                <div className="p-8 rounded-2xl bg-gradient-primary text-white shadow-float relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <div className="relative z-10">
                    <h3 className="font-bold mb-4 flex items-center gap-3 text-2xl">
                      <Heart className="w-6 h-6" />
                      Estado Geral
                    </h3>
                    <p className="text-white/95 leading-relaxed text-lg">{analysis.generalHealth}</p>
                  </div>
                </div>

                {/* Enhanced sections grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Positive Aspects */}
                  {analysis.positiveAspects.length > 0 && (
                    <Card className="bg-green-50/80 border-green-200/50 shadow-soft backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-green-800 mb-4 flex items-center gap-3 text-lg">
                          <CheckCircle className="w-5 h-5" />
                          Aspectos Positivos
                        </h3>
                        <ul className="space-y-3">
                          {analysis.positiveAspects.map((aspect, index) => (
                            <li key={index} className="text-green-700 flex items-start gap-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="leading-relaxed">{aspect}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Concern Areas */}
                  {analysis.concernAreas.length > 0 && (
                    <Card className="bg-amber-50/80 border-amber-200/50 shadow-soft backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-3 text-lg">
                          <AlertCircle className="w-5 h-5" />
                          Pontos de Atenção
                        </h3>
                        <ul className="space-y-3">
                          {analysis.concernAreas.map((concern, index) => (
                            <li key={index} className="text-amber-700 flex items-start gap-3">
                              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="leading-relaxed">{concern}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  {analysis.recommendations.length > 0 && (
                    <Card className="bg-blue-50/80 border-blue-200/50 shadow-soft backdrop-blur-sm md:col-span-2 lg:col-span-1">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-3 text-lg">
                          <Sparkles className="w-5 h-5" />
                          Recomendações
                        </h3>
                        <ul className="space-y-3">
                          {analysis.recommendations.map((recommendation, index) => (
                            <li key={index} className="text-blue-700 flex items-start gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="leading-relaxed">{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Enhanced disclaimer */}
                <Card className="bg-muted/30 border-border/30 shadow-inner backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-destructive/10 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-destructive" />
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

            {/* Enhanced testimonials */}
            <div className="grid md:grid-cols-2 gap-8 mt-12">
              {[
                {
                  name: "Dr. Maria Silva",
                  role: "Veterinária Especialista",
                  text: "VetCam revolucionou minha prática clínica. A precisão é impressionante!",
                  rating: 5
                },
                {
                  name: "Dr. João Santos", 
                  role: "Clínica Veterinária ABC",
                  text: "Ferramenta indispensável para diagnósticos rápidos e precisos.",
                  rating: 5
                }
              ].map((testimonial, index) => (
                <Card key={index} className="backdrop-blur-lg bg-card/80 border border-border/50 shadow-card animate-fade-in" style={{ animationDelay: `${index * 0.3}s` }}>
                  <CardContent className="p-8">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-secondary fill-current" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 text-lg italic">"{testimonial.text}"</p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Support and Refund Buttons */}
        <div className="max-w-2xl mx-auto mt-16 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Support Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 h-14 bg-gradient-soft border-border/30 hover:bg-primary-light/20 transition-all duration-300 group"
                  onClick={() => {
                    setSupportSubmitted(false);
                    setSupportData({ phone: '', help: '' });
                  }}
                >
                  <Phone className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                  Suporte Técnico
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <Phone className="w-6 h-6 text-primary" />
                    Suporte Técnico
                  </DialogTitle>
                </DialogHeader>
                {supportSubmitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Solicitação Enviada!</h3>
                    <p className="text-muted-foreground">
                      Nossa equipe de suporte entrará em contato com você em breve através do número fornecido.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="phone">Telefone / WhatsApp</Label>
                      <Input
                        id="phone"
                        placeholder="(11) 99999-9999"
                        value={supportData.phone}
                        onChange={(e) => setSupportData({ ...supportData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="help">Como podemos ajudar?</Label>
                      <Textarea
                        id="help"
                        placeholder="Descreva sua dúvida ou problema..."
                        value={supportData.help}
                        onChange={(e) => setSupportData({ ...supportData, help: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <Button
                      onClick={handleSupportSubmit}
                      className="w-full bg-gradient-primary hover:shadow-glow"
                    >
                      Enviar Solicitação
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Refund Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 h-14 bg-gradient-soft border-border/30 hover:bg-secondary-light/20 transition-all duration-300 group"
                  onClick={() => {
                    setRefundSubmitted(false);
                    setRefundData({ email: '', reason: '' });
                  }}
                >
                  <CreditCard className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                  Solicitar Reembolso
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-secondary" />
                    Solicitar Reembolso
                  </DialogTitle>
                </DialogHeader>
                {refundSubmitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Solicitação Recebida!</h3>
                    <p className="text-muted-foreground">
                      Nossa equipe analisará sua solicitação e processará o reembolso em até <strong>2 dias úteis</strong> por questões bancárias.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={refundData.email}
                        onChange={(e) => setRefundData({ ...refundData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reason">Motivo do reembolso</Label>
                      <Textarea
                        id="reason"
                        placeholder="Explique o motivo da solicitação..."
                        value={refundData.reason}
                        onChange={(e) => setRefundData({ ...refundData, reason: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <Button
                      onClick={handleRefundSubmit}
                      className="w-full bg-gradient-secondary hover:shadow-glow"
                    >
                      Solicitar Reembolso
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative max-w-4xl w-full max-h-[90vh] bg-card rounded-2xl overflow-hidden shadow-float">
              <div className="absolute top-4 right-4 z-10">
                <Button
                  onClick={closeCamera}
                  variant="outline"
                  size="sm"
                  className="bg-black/50 text-white border-white/30 hover:bg-black/70"
                >
                  ✕
                </Button>
              </div>
              
              <div className="relative">
                <video
                  id="camera-video"
                  autoPlay
                  playsInline
                  muted
                  ref={(video) => {
                    if (video && stream) {
                      video.srcObject = stream;
                    }
                  }}
                  className="w-full h-auto max-h-[70vh] object-cover"
                />
                
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                  <Button
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 shadow-lg"
                    variant="secondary"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 transition-colors" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthAnalyzer;
