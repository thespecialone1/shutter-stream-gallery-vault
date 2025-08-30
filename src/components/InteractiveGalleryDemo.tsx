import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Upload, 
  Share2, 
  Heart, 
  Download, 
  Lock, 
  Eye,
  Plus,
  ArrowRight,
  CheckCircle,
  Sparkles
} from "lucide-react";

const sampleImages = [
  { id: '1', name: 'sunset-beach.jpg', favorites: 12, views: 45 },
  { id: '2', name: 'wedding-ceremony.jpg', favorites: 28, views: 67 },
  { id: '3', name: 'couple-portrait.jpg', favorites: 19, views: 52 },
  { id: '4', name: 'reception-dance.jpg', favorites: 15, views: 38 },
];

const InteractiveGalleryDemo = () => {
  const [step, setStep] = useState(1);
  const [galleryName, setGalleryName] = useState("");
  const [clientName, setClientName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const handleNextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleCreateGallery = () => {
    setIsCreating(true);
    // Simulate gallery creation
    setTimeout(() => {
      setIsCreating(false);
      setStep(4);
    }, 2000);
  };

  const simulateUpload = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setStep(3), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  useEffect(() => {
    if (step === 2 && galleryName && clientName) {
      simulateUpload();
    }
  }, [step, galleryName, clientName]);

  return (
    <section className="container mx-auto px-6 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Interactive Demo</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-serif text-foreground mb-4">
            Try Creating Your First Gallery
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience how simple it is to create stunning client galleries in just a few clicks.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Interactive Demo */}
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
              {[1, 2, 3, 4].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    step >= stepNum 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step > stepNum ? <CheckCircle className="h-5 w-5" /> : stepNum}
                  </div>
                  {stepNum < 4 && (
                    <div className={`w-16 h-0.5 mx-2 transition-all duration-300 ${
                      step > stepNum ? 'bg-primary' : 'bg-border'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Gallery Setup */}
            {step === 1 && (
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    Create New Gallery
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Gallery Name</label>
                    <Input 
                      placeholder="Sarah & Mike's Wedding"
                      value={galleryName}
                      onChange={(e) => setGalleryName(e.target.value)}
                      className="focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Client Name</label>
                    <Input 
                      placeholder="Sarah Johnson"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="focus:ring-primary"
                    />
                  </div>
                  <Button 
                    onClick={handleNextStep}
                    disabled={!galleryName || !clientName}
                    className="w-full btn-premium"
                  >
                    Create Gallery
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Upload Progress */}
            {step === 2 && (
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Uploading Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Upload className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <p className="text-muted-foreground mb-4">Processing your beautiful images...</p>
                    <div className="w-full bg-border rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{uploadProgress}% complete</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Gallery Preview */}
            {step === 3 && (
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Gallery Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                      <div>
                        <h3 className="font-medium">{galleryName}</h3>
                        <p className="text-sm text-muted-foreground">Client: {clientName}</p>
                      </div>
                      <Badge variant="secondary">
                        <Lock className="h-3 w-3 mr-1" />
                        Protected
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {sampleImages.map((img, idx) => (
                        <div key={img.id} className="relative group">
                          <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                            {img.name}
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1">
                              <Badge variant="secondary" className="text-xs">
                                <Heart className="h-3 w-3 mr-1" />
                                {img.favorites}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button onClick={handleNextStep} className="w-full btn-premium">
                      Share Gallery
                      <Share2 className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Success & Analytics */}
            {step === 4 && (
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <CheckCircle className="h-5 w-5" />
                    Gallery Created Successfully!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Your gallery is live and ready to share!
                    </p>
                    <div className="bg-accent/20 rounded-lg p-4 text-left">
                      <p className="text-sm font-medium mb-2">Share Link:</p>
                      <code className="text-xs bg-background px-2 py-1 rounded border">
                        pixie.studio/s/sarah-mike-wedding
                      </code>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    variant="outline" 
                    className="w-full"
                  >
                    {showAnalytics ? 'Hide' : 'View'} Analytics Preview
                  </Button>

                  {showAnalytics && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="text-center p-3 bg-primary/5 rounded-lg">
                        <div className="text-2xl font-bold text-primary">127</div>
                        <div className="text-xs text-muted-foreground">Total Views</div>
                      </div>
                      <div className="text-center p-3 bg-accent/20 rounded-lg">
                        <div className="text-2xl font-bold text-foreground">74</div>
                        <div className="text-xs text-muted-foreground">Favorites</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Side - Feature Highlights */}
          <div className="space-y-6">
            <Card className="card-premium p-6">
              <h3 className="font-serif text-xl mb-4">What You Get</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Password Protection</h4>
                    <p className="text-sm text-muted-foreground">Secure galleries that only your clients can access</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Heart className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Client Favorites</h4>
                    <p className="text-sm text-muted-foreground">Let clients mark their favorite images for easy selection</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Download className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">High-Quality Downloads</h4>
                    <p className="text-sm text-muted-foreground">Full resolution downloads for prints and sharing</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Eye className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Real-Time Analytics</h4>
                    <p className="text-sm text-muted-foreground">See how clients engage with your work</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="card-premium p-6 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="text-center">
                <h3 className="font-serif text-lg mb-2">Ready to get started?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your professional gallery in minutes
                </p>
                <Button className="btn-premium w-full" onClick={() => setStep(1)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveGalleryDemo;