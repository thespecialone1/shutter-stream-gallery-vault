import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Shield, Heart, Sparkles } from "lucide-react";
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
          <h1 className="text-5xl md:text-7xl font-bold mb-6" 
              style={{ 
                background: 'var(--gradient-artistic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
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
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
              <Camera className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Artistic Galleries</h3>
            <p className="text-muted-foreground">Create beautiful, branded galleries that preserve the artistic integrity of your work with elegant layouts.</p>
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
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Secure Access</h3>
            <p className="text-muted-foreground">Password-protected galleries with secure sessions ensure your client's photos remain private and protected.</p>
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
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Client Favorites</h3>
            <p className="text-muted-foreground">Let clients mark their favorite photos for easy selection, sharing, and ordering with a simple one-click system.</p>
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
