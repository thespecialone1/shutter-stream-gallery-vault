import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Shield, Download } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Camera className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Gallery Pro</h1>
                <p className="text-sm text-muted-foreground">Professional Photo Delivery</p>
              </div>
            </div>
            <Link to="/admin">
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Admin Panel
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Professional Photo
            <span className="text-primary block">Gallery Delivery</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Secure, password-protected galleries for delivering professional photography to clients.
            Easy upload, organized sections, and bulk download capabilities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/admin">
              <Button size="lg">
                <Upload className="w-5 h-5 mr-2" />
                Create Gallery
              </Button>
            </Link>
            <Link to="/gallery/demo">
              <Button variant="outline" size="lg">
                <Shield className="w-5 h-5 mr-2" />
                View Sample Gallery
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">
            Everything you need for professional delivery
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Password Protected</CardTitle>
                <CardDescription>
                  Secure galleries with client-specific passwords to protect private moments
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Camera className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Organized Sections</CardTitle>
                <CardDescription>
                  Organize photos into sections like "Ceremony", "Reception", and "Portraits"
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Download className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Bulk Downloads</CardTitle>
                <CardDescription>
                  Clients can download individual images or entire galleries with one click
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
