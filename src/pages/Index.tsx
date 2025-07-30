import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Shield, Heart, Sparkles, Image, Users, Download, Eye, Lock, Star, ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-subtle)' }}>
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">PixieStudio</span>
          </div>
          <div className="flex gap-4">
            <Button asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6 px-6 py-3 rounded-full text-sm font-medium" 
               style={{ 
                 background: 'var(--gradient-artistic)',
                 color: 'var(--accent-foreground)',
                 boxShadow: 'var(--shadow-artistic)'
               }}>
            <Sparkles className="h-4 w-4" />
            Professional Photo Gallery Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground">
            Showcase Your Art
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Create stunning, password-protected galleries for your clients. Where artistic vision meets professional delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8 py-6 transition-all duration-300 hover:scale-105"
                    style={{ 
                      background: 'var(--gradient-primary)',
                      boxShadow: 'var(--shadow-elegant)'
                    }}>
              <Link to="/auth">Begin Your Journey</Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 transition-all duration-300 hover:scale-105 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              Discover Features
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything You Need for Professional Galleries</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From stunning presentation to secure delivery, our platform handles every aspect of your client gallery experience.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          <div className="group p-8 rounded-2xl border bg-card transition-all duration-500 hover:scale-105"
               style={{ 
                 boxShadow: 'var(--shadow-soft)',
                 transition: 'var(--transition-elegant)'
               }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                 style={{ 
                   background: 'var(--gradient-artistic)',
                   boxShadow: 'var(--shadow-artistic)'
                 }}>
              <Image className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Masonry Layouts</h3>
            <p className="text-muted-foreground">Showcase your work in beautiful masonry grids that adapt to every device. Let your photos breathe with elegant spacing.</p>
          </div>
          
          <div className="group p-8 rounded-2xl border bg-card transition-all duration-500 hover:scale-105"
               style={{ 
                 boxShadow: 'var(--shadow-soft)',
                 transition: 'var(--transition-elegant)'
               }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                 style={{ 
                   background: 'var(--gradient-artistic)',
                   boxShadow: 'var(--shadow-artistic)'
                 }}>
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Secure Access</h3>
            <p className="text-muted-foreground">Password-protected galleries with secure sessions ensure your client's photos remain private and protected throughout.</p>
          </div>
          
          <div className="group p-8 rounded-2xl border bg-card transition-all duration-500 hover:scale-105"
               style={{ 
                 boxShadow: 'var(--shadow-soft)',
                 transition: 'var(--transition-elegant)'
               }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                 style={{ 
                   background: 'var(--gradient-artistic)',
                   boxShadow: 'var(--shadow-artistic)'
                 }}>
              <Download className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Batch Downloads</h3>
            <p className="text-muted-foreground">Clients can select multiple images and download them at once, or download individual photos with a single click.</p>
          </div>

          <div className="group p-8 rounded-2xl border bg-card transition-all duration-500 hover:scale-105"
               style={{ 
                 boxShadow: 'var(--shadow-soft)',
                 transition: 'var(--transition-elegant)'
               }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                 style={{ 
                   background: 'var(--gradient-artistic)',
                   boxShadow: 'var(--shadow-artistic)'
                 }}>
              <Star className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Client Favorites</h3>
            <p className="text-muted-foreground">Let clients mark their favorite photos for easy selection, sharing, and ordering with an intuitive favoriting system.</p>
          </div>

          <div className="group p-8 rounded-2xl border bg-card transition-all duration-500 hover:scale-105"
               style={{ 
                 boxShadow: 'var(--shadow-soft)',
                 transition: 'var(--transition-elegant)'
               }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                 style={{ 
                   background: 'var(--gradient-artistic)',
                   boxShadow: 'var(--shadow-artistic)'
                 }}>
              <Eye className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Analytics Tracking</h3>
            <p className="text-muted-foreground">Track how clients interact with your galleries. See which photos get the most attention and engagement.</p>
          </div>

          <div className="group p-8 rounded-2xl border bg-card transition-all duration-500 hover:scale-105"
               style={{ 
                 boxShadow: 'var(--shadow-soft)',
                 transition: 'var(--transition-elegant)'
               }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                 style={{ 
                   background: 'var(--gradient-artistic)',
                   boxShadow: 'var(--shadow-artistic)'
                 }}>
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Client Experience</h3>
            <p className="text-muted-foreground">Seamless viewing experience with smooth hover effects, lightbox viewing, and responsive design for all devices.</p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get your professional gallery up and running in minutes with our streamlined process.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
          <div className="text-center group">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">1</div>
            </div>
            <h3 className="text-xl font-semibold mb-3">Create Gallery</h3>
            <p className="text-muted-foreground">Upload your photos and set a secure password for client access. Organize by sections if needed.</p>
          </div>

          <div className="text-center group">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">2</div>
            </div>
            <h3 className="text-xl font-semibold mb-3">Share With Clients</h3>
            <p className="text-muted-foreground">Send the gallery link and password to your clients. They can access it from any device.</p>
          </div>

          <div className="text-center group">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">3</div>
            </div>
            <h3 className="text-xl font-semibold mb-3">Track & Deliver</h3>
            <p className="text-muted-foreground">Monitor gallery activity and let clients favorite and download their chosen photos.</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-24 p-12 rounded-3xl border"
             style={{ 
               background: 'var(--gradient-subtle)',
               boxShadow: 'var(--shadow-elegant)'
             }}>
          <h2 className="text-3xl font-bold mb-4">Ready to elevate your client experience?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join photographers who trust our platform to deliver their best work securely and beautifully.
          </p>
          <Button size="lg" asChild className="text-lg px-8 py-6 transition-all duration-300 hover:scale-105"
                  style={{ 
                    background: 'var(--gradient-primary)',
                    boxShadow: 'var(--shadow-elegant)'
                  }}>
            <Link to="/auth">Start Your Journey</Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-6 w-6 text-primary" />
              <span className="font-semibold">PixieStudio</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 PixieStudio. Professional photo gallery platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
