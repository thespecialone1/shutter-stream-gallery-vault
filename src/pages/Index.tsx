import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Shield, Heart, Sparkles, Image, Users, Download, Eye, Lock, Star, ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header */}
      <header className="nav-premium fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Camera className="h-4 w-4 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-lg sm:text-2xl font-serif font-medium text-foreground">Pixie Studio</span>
                <p className="text-xs text-muted-foreground -mt-1 hidden sm:block">Secure Galleries</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <Button variant="ghost" asChild className="hidden md:flex text-muted-foreground hover:text-foreground">
                <Link to="/browse">Browse Galleries</Link>
              </Button>
              <Button variant="ghost" asChild className="hidden sm:flex text-muted-foreground hover:text-foreground">
                <Link to="/galleries">All Galleries</Link>
              </Button>
              <Button asChild className="btn-premium text-sm sm:text-base px-3 sm:px-4">
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-24">
        <section className="container mx-auto px-6 py-20 text-center">
          <div className="max-w-4xl mx-auto fade-in-up">
            <div className="inline-flex items-center gap-2 mb-8 px-6 py-3 rounded-full bg-accent/50 border border-border">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Where Memories Live Forever</span>
            </div>
            
            <h1 className="heading-hero mb-8">
              Beautiful Client
              <br />
              Photo Galleries
            </h1>
            
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Create stunning, password-protected galleries that showcase your artistry. 
              Where professional photography meets elegant presentation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button size="lg" asChild className="btn-premium text-base px-8 sm:px-10 py-4 w-full sm:w-auto">
                <Link to="/auth">
                  Start Creating
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="btn-premium-outline text-base px-8 sm:px-10 py-4 w-full sm:w-auto">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="text-center mb-16 fade-in">
            <h2 className="heading-xl mb-6">Crafted for Photographers</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every detail designed to showcase your work beautifully while providing 
              a seamless experience for your clients.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="card-premium p-8 text-center group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Image className="w-8 h-8 text-primary" />
              </div>
              <h3 className="heading-md mb-4">Masonry Perfection</h3>
              <p className="text-muted-foreground">
                Intelligent layouts that adapt to your images, creating a 
                flowing gallery experience that feels natural and engaging.
              </p>
            </div>
            
            <div className="card-premium p-8 text-center group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="heading-md mb-4">Secure & Private</h3>
              <p className="text-muted-foreground">
                Password-protected galleries with secure sessions ensure your 
                client's memories remain safe and accessible only to them.
              </p>
            </div>
            
            <div className="card-premium p-8 text-center group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Download className="w-8 h-8 text-primary" />
              </div>
              <h3 className="heading-md mb-4">Smart Downloads</h3>
              <p className="text-muted-foreground">
                Clients can select favorites and download individual images or 
                entire collections with a single click.
              </p>
            </div>

            <div className="card-premium p-8 text-center group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <h3 className="heading-md mb-4">Client Favorites</h3>
              <p className="text-muted-foreground">
                Elegant favoriting system helps clients curate their selections 
                for prints, social sharing, and keepsakes.
              </p>
            </div>

            <div className="card-premium p-8 text-center group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Eye className="w-8 h-8 text-primary" />
              </div>
              <h3 className="heading-md mb-4">Insightful Analytics</h3>
              <p className="text-muted-foreground">
                Understand how clients engage with your work. See which images 
                resonate most and optimize your presentation.
              </p>
            </div>

            <div className="card-premium p-8 text-center group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="heading-md mb-4">Seamless Experience</h3>
              <p className="text-muted-foreground">
                Responsive design ensures your galleries look stunning on every 
                device, from mobile to desktop viewing.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-accent/20 py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="heading-xl mb-6">Simple. Elegant. Professional.</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From upload to delivery, every step is designed to be effortless 
                while maintaining the highest standards of presentation.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              <div className="text-center group">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                  <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center text-primary font-serif font-bold text-2xl">1</div>
                </div>
                <h3 className="heading-md mb-4">Create & Upload</h3>
                <p className="text-muted-foreground">
                  Upload your beautiful images and organize them into themed galleries. 
                  Set secure passwords for client access.
                </p>
              </div>

              <div className="text-center group">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                  <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center text-primary font-serif font-bold text-2xl">2</div>
                </div>
                <h3 className="heading-md mb-4">Share Beautifully</h3>
                <p className="text-muted-foreground">
                  Send your clients a personalized link with password access. 
                  They'll be amazed by the elegant presentation.
                </p>
              </div>

              <div className="text-center group">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                  <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center text-primary font-serif font-bold text-2xl">3</div>
                </div>
                <h3 className="heading-md mb-4">Delight & Deliver</h3>
                <p className="text-muted-foreground">
                  Watch as clients favorite their photos and download their selections. 
                  Track engagement and exceed expectations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="card-premium p-12 bg-gradient-to-br from-background via-accent/10 to-background">
              <h2 className="heading-xl mb-6">Ready to Elevate Your Client Experience?</h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                Join photographers who trust Pixie Studio to showcase their artistry 
                and create unforgettable gallery experiences for their clients.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="btn-premium text-base px-8 sm:px-10 py-4 w-full sm:w-auto">
                  <Link to="/auth">
                    Start Your Journey
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="btn-premium-outline text-base px-8 sm:px-10 py-4 w-full sm:w-auto">
                  <Link to="/browse">Browse Examples</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-border bg-accent/10">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Camera className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif font-medium text-foreground">Pixie Studio</span>
                <p className="text-xs text-muted-foreground -mt-1">Premium Galleries</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Pixie Studio. Crafting beautiful gallery experiences.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;