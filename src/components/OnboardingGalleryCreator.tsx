import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Camera, Upload, Check, ArrowRight, ImageIcon, Sparkles, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import heic2any from "heic2any";

type Step = "name" | "photos" | "complete";

export function OnboardingGalleryCreator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>("name");
  const [galleryName, setGalleryName] = useState("");
  const [galleryDescription, setGalleryDescription] = useState("");
  const [createdGalleryId, setCreatedGalleryId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const createGallery = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to create a gallery",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    if (!galleryName.trim()) {
      toast({
        title: "Name required",
        description: "Give your gallery a name",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("galleries")
        .insert({
          name: galleryName.trim(),
          description: galleryDescription.trim() || null,
          client_name: user.email?.split("@")[0] || "Creator",
          photographer_id: user.id,
          is_public: true // Always public for onboarding
        })
        .select()
        .single();

      if (error) throw error;

      setCreatedGalleryId(data.id);
      setStep("photos");
      toast({
        title: "Gallery created!",
        description: "Now add at least one photo"
      });
    } catch (error) {
      console.error("Error creating gallery:", error);
      toast({
        title: "Error",
        description: "Failed to create gallery",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!createdGalleryId) return;

    const imageFiles = files.filter(
      (f) => f.type.startsWith("image/") || f.name.toLowerCase().endsWith(".heic")
    );

    if (imageFiles.length === 0) {
      toast({
        title: "No images",
        description: "Please select image files",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    for (const file of imageFiles.slice(0, 10)) {
      try {
        let processedFile = file;

        // Convert HEIC if needed
        if (file.name.toLowerCase().endsWith(".heic")) {
          try {
            const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
            const blob = Array.isArray(converted) ? converted[0] : converted;
            processedFile = new File([blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
          } catch {
            // Use original if conversion fails
          }
        }

        const ext = processedFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const filePath = `${createdGalleryId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("gallery-images")
          .upload(filePath, processedFile);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("images").insert({
          gallery_id: createdGalleryId,
          filename: fileName,
          original_filename: file.name,
          file_size: processedFile.size,
          mime_type: processedFile.type,
          full_path: filePath
        });

        if (dbError) throw dbError;
        successCount++;
        setUploadedCount((prev) => prev + 1);
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast({
        title: "Photos uploaded!",
        description: `${successCount} photo(s) added to your gallery`
      });
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [createdGalleryId]
  );

  const finishOnboarding = () => {
    if (uploadedCount === 0) {
      toast({
        title: "Add a photo first",
        description: "Upload at least one photo to complete your gallery",
        variant: "destructive"
      });
      return;
    }
    setStep("complete");
  };

  const viewGallery = () => {
    if (createdGalleryId) {
      navigate(`/gallery/${createdGalleryId}`);
    }
  };

  if (!user) {
    return (
      <Card className="max-w-lg mx-auto p-8 text-center">
        <Camera className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-serif font-medium mb-2">Create Your First Gallery</h3>
        <p className="text-muted-foreground mb-6">Sign in to start sharing your photos with the world</p>
        <Button onClick={() => navigate("/auth")}>
          Sign In to Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto overflow-hidden">
      {/* Progress indicator */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            {step === "name" && "Step 1: Name your gallery"}
            {step === "photos" && "Step 2: Add photos"}
            {step === "complete" && "All done!"}
          </span>
          <span className="text-xs text-muted-foreground">
            {step === "name" && "1/2"}
            {step === "photos" && "2/2"}
            {step === "complete" && "Complete"}
          </span>
        </div>
        <Progress 
          value={step === "name" ? 33 : step === "photos" ? 66 : 100} 
          className="h-1.5" 
        />
      </div>

      <div className="p-6">
        {/* Step 1: Name */}
        {step === "name" && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-medium">Let's create something beautiful</h3>
              <p className="text-sm text-muted-foreground mt-1">Your gallery will be public and visible in the feed</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Gallery Name</label>
                <Input
                  placeholder="My Photography Collection"
                  value={galleryName}
                  onChange={(e) => setGalleryName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
                <Textarea
                  placeholder="A collection of my favorite shots..."
                  value={galleryDescription}
                  onChange={(e) => setGalleryDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={createGallery}
              disabled={!galleryName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Photos */}
        {step === "photos" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <ImageIcon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-medium">Add your photos</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload at least 1 photo to complete your gallery
              </p>
            </div>

            {/* Upload area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.multiple = true;
                input.accept = "image/*,.heic";
                input.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []);
                  handleFiles(files);
                };
                input.click();
              }}
            >
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                  <p className="text-sm font-medium">Uploading photos...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium mb-1">Drop photos here or click to browse</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, HEIC supported</p>
                </>
              )}
            </div>

            {/* Upload count */}
            {uploadedCount > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <Check className="h-4 w-4" />
                <span>{uploadedCount} photo{uploadedCount > 1 ? "s" : ""} uploaded</span>
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={finishOnboarding}
              disabled={uploadedCount === 0 || isUploading}
            >
              {uploadedCount === 0 ? "Upload at least 1 photo" : "Finish & View Gallery"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Complete */}
        {step === "complete" && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-serif font-medium mb-2">Your gallery is live!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Your photos are now visible to everyone in the feed
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={viewGallery}>
                View My Gallery
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/feed")}>
                Explore the Feed
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
