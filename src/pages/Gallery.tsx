import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Camera, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Gallery = {
  id: string;
  name: string;
  description: string;
  client_name: string;
};

type Section = {
  id: string;
  name: string;
  sort_order: number;
};

type Image = {
  id: string;
  filename: string;
  original_filename: string;
  full_path: string;
  thumbnail_path: string;
  section_id: string | null;
  width: number;
  height: number;
};

const Gallery = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const { toast } = useToast();

  // Check if password is in URL params (for direct links)
  useEffect(() => {
    const urlPassword = searchParams.get("password");
    if (urlPassword && id) {
      setPassword(urlPassword);
      handlePasswordSubmit(urlPassword);
    }
  }, [id, searchParams]);

  const handlePasswordSubmit = async (submittedPassword?: string) => {
    if (!id) return;
    
    setLoading(true);
    const passwordToCheck = submittedPassword || password;
    
    try {
      // Get gallery and verify password
      const { data: galleryData, error: galleryError } = await supabase
        .from("galleries")
        .select("*")
        .eq("id", id)
        .single();

      if (galleryError) {
        toast({
          title: "Gallery not found",
          description: "The gallery you're looking for doesn't exist.",
          variant: "destructive",
        });
        return;
      }

      // Simple password verification (in production, use proper hashing)
      if (galleryData.password_hash !== passwordToCheck) {
        toast({
          title: "Incorrect password",
          description: "Please check your password and try again.",
          variant: "destructive",
        });
        return;
      }

      setGallery(galleryData);
      setIsAuthenticated(true);

      // Load sections and images
      await Promise.all([loadSections(id), loadImages(id)]);
      
      toast({
        title: "Welcome!",
        description: `Access granted to ${galleryData.name}`,
      });
    } catch (error) {
      console.error("Error verifying password:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async (galleryId: string) => {
    const { data, error } = await supabase
      .from("sections")
      .select("*")
      .eq("gallery_id", galleryId)
      .order("sort_order");

    if (error) {
      console.error("Error loading sections:", error);
      return;
    }

    setSections(data || []);
  };

  const loadImages = async (galleryId: string) => {
    const { data, error } = await supabase
      .from("images")
      .select("*")
      .eq("gallery_id", galleryId)
      .order("upload_date");

    if (error) {
      console.error("Error loading images:", error);
      return;
    }

    setImages(data || []);
  };

  const getImageUrl = (path: string) => {
    return `https://xcucqsonzfovlcxktxiy.supabase.co/storage/v1/object/public/gallery-images/${path}`;
  };

  const downloadImage = async (image: Image) => {
    try {
      const response = await fetch(getImageUrl(image.full_path));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = image.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading image:", error);
      toast({
        title: "Download failed",
        description: "Could not download the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderImageGrid = (sectionImages: Image[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {sectionImages.map((image) => (
        <div key={image.id} className="group relative aspect-square">
          <img
            src={getImageUrl(image.thumbnail_path || image.full_path)}
            alt={image.original_filename}
            className="w-full h-full object-cover rounded-lg cursor-pointer transition-opacity group-hover:opacity-80"
            onClick={() => setSelectedImage(image)}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(image);
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(image);
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Protected Gallery</CardTitle>
            <p className="text-muted-foreground">
              Enter the password to access this gallery
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                placeholder="Enter gallery password"
              />
            </div>
            <Button
              onClick={() => handlePasswordSubmit()}
              disabled={loading || !password}
              className="w-full"
            >
              {loading ? "Verifying..." : "Access Gallery"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Camera className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{gallery?.name}</h1>
              <p className="text-sm text-muted-foreground">
                For {gallery?.client_name}
              </p>
            </div>
          </div>
          {gallery?.description && (
            <p className="text-muted-foreground mt-4">{gallery.description}</p>
          )}
        </div>
      </header>

      {/* Gallery Content */}
      <div className="container mx-auto px-4 py-8">
        {sections.length > 0 ? (
          <Tabs defaultValue={sections[0]?.id || "all"}>
            <TabsList className="mb-8">
              <TabsTrigger value="all">All Photos</TabsTrigger>
              {sections.map((section) => (
                <TabsTrigger key={section.id} value={section.id}>
                  {section.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              {renderImageGrid(images)}
            </TabsContent>

            {sections.map((section) => (
              <TabsContent key={section.id} value={section.id}>
                {renderImageGrid(
                  images.filter((img) => img.section_id === section.id)
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          renderImageGrid(images)
        )}

        {images.length === 0 && (
          <div className="text-center py-12">
            <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No photos available yet.</p>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={getImageUrl(selectedImage.full_path)}
              alt={selectedImage.original_filename}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4"
              onClick={(e) => {
                e.stopPropagation();
                downloadImage(selectedImage);
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;