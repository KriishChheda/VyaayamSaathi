import React from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import homeVideo from '../assets/HomePage.mp4';
import {
  Camera,
  Target,
  Smartphone,
  TrendingUp,
  Shield,
  Users,
  Play,
  CheckCircle,
  Star,
  Activity
} from "lucide-react";

export function LandingPage({
  onShowLogin,
  onShowSignup,
}) {
  const features = [
    {
      icon: Camera,
      title: "AI-Powered Form Analysis",
      description:
        "Real-time computer vision tracks your movements and provides instant feedback to ensure elite form.",
      image:
        "https://images.unsplash.com/photo-1734189605012-f03d97a4d98f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxneW0lMjB0cmFpbmluZyUyMGV4ZXJjaXNlfGVufDF8fHx8MTc2Mzg5NTYxNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      color: "text-[#534AB7]",
      bgColor: "bg-[#EEEDFE]"
    },
    {
      icon: Target,
      title: "Personalized Workouts",
      description:
        "Customized exercise plans based on your fitness level, goals, and available equipment.",
      image:
        "https://images.unsplash.com/photo-1748485378587-4ed27d79cce7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdGhsZXRpYyUyMHRyYWluaW5nJTIwZm9ybXxlbnwxfHx8fDE3NjM4OTU2MTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      color: "text-[#0F6E56]",
      bgColor: "bg-[#E1F5EE]"
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description:
        "Monitor your improvement with deeply integrated analytics and historic performance metrics.",
      image:
        "https://images.unsplash.com/photo-1758875568756-37a9c5c1a4f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwcHJvZ3Jlc3MlMjB0cmFja2luZ3xlbnwxfHx8fDE3NjM4NTY3NDd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      color: "text-[#993C1D]",
      bgColor: "bg-[#FAECE7]"
    },
  ];

  const testimonials = [
    {
      name: "Alex Rivera",
      text: "VyayamSaathi helped me perfect my technique and avoid injuries. Having instant camera feedback is a total game changer!",
      rating: 5,
      image:
        "https://images.unsplash.com/photo-1663576748377-cafb47103042?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdGhsZXRlJTIwcG9ydHJhaXQlMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzYzODIwNzE4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      name: "Jordan Lee",
      text: "Finally, a personal trainer in my pocket. The form feedback is incredibly accurate and the UI feels delightfully premium.",
      rating: 5,
      image:
        "https://images.unsplash.com/photo-1669807164466-10a6584a067e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlbmd0aCUyMHRyYWluaW5nJTIwd29ya291dHxlbnwxfHx8fDE3NjM4NjYxNDl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-border z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#030213] rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm tracking-wider">
                  VS
                </span>
              </div>
              <span className="font-extrabold text-xl tracking-tight text-neutral-900">
                VyayamSaathi
              </span>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <Button
                variant="ghost"
                className="font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
                onClick={onShowLogin}
              >
                Login
              </Button>
              <Button 
                className="bg-[#030213] text-white hover:bg-neutral-800 font-semibold px-6 shadow-sm rounded-full"
                onClick={onShowSignup}
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 lg:py-24 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        
        {/* Left Column (Text) */}
        <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start">
          <Badge className="mb-6 bg-[#EEEDFE] text-[#534AB7] hover:bg-[#EEEDFE] border-0 px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
            AI-Powered Fitness
          </Badge>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-neutral-900 leading-[1.1] tracking-tight">
            Perfect Your Form <span className="text-brand">Instantly.</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-xl">
            Experience real-time form correction through your device's camera. 
            Train smarter, prevent injuries, and accelerate your fitness milestones with VyayamSaathi.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-[#030213] hover:bg-neutral-800 text-white rounded-full px-8 py-6 text-base font-bold shadow-md transition-transform hover:scale-[1.02]"
              onClick={onShowSignup}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-border/60 hover:bg-neutral-50 rounded-full px-8 py-6 text-base font-bold text-neutral-700 transition-transform hover:scale-[1.02]"
              onClick={onShowLogin}
            >
              <Play className="w-4 h-4 mr-2" /> Watch Demo
            </Button>
          </div>
        </div>

        {/* Right Column (Hero Image) */}
        <div className="flex-1 w-full max-w-2xl mx-auto relative lg:mt-0 xl:mr-8">
          <div className="aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative group">
            <video
              src={homeVideo}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Overlay grid graphic */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
          </div>

          {/* Floating stat 1 */}
          <div className="absolute -bottom-6 sm:-bottom-8 left-4 sm:left-[-2rem] bg-white rounded-xl shadow-xl p-4 border border-border/40 animate-[bounce_8s_infinite] transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E1F5EE] rounded-full flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-[#0F6E56]" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Accuracy</p>
                <span className="text-base font-extrabold text-neutral-900">95% Proven</span>
              </div>
            </div>
          </div>

          {/* Floating stat 2 */}
          <div className="absolute top-8 right-4 sm:right-[-2rem] bg-white rounded-xl shadow-xl p-4 border border-border/40 animate-[bounce_8s_infinite_1s] transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#EEEDFE] rounded-full flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-[#534AB7]" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Growth</p>
                <span className="text-base font-extrabold text-neutral-900">+24% Faster</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 lg:py-32 bg-neutral-50/50 border-y border-border/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge className="mb-4 bg-white border border-border/60 text-neutral-700 px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
              Core Capabilities
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-neutral-900 tracking-tight">
              Why Choose VyayamSaathi?
            </h2>
            <p className="text-base md:text-lg text-muted-foreground">
              Deep machine learning combined with elite fitness coaching blueprints to 
              create the ultimate training companion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-shadow bg-white rounded-2xl group">
                  <CardContent className="p-0">
                    <div className="aspect-[16/10] relative overflow-hidden">
                      <ImageWithFallback
                        src={feature.image}
                        alt={feature.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent mix-blend-multiply"></div>
                      <div className="absolute bottom-5 left-5">
                        <div className={`${feature.bgColor} rounded-xl p-3 shadow-lg inline-flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${feature.color}`} />
                        </div>
                      </div>
                    </div>
                    <div className="p-6 lg:p-8">
                      <h3 className="text-xl font-bold mb-3 text-neutral-900 flex items-center gap-2">
                        {feature.title} 
                      </h3>
                      <p className="text-[15px] leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 lg:py-28 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="w-6 h-6 fill-amber-400 text-amber-400"
              />
            ))}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight mb-2">Trusted Globally</h2>
          <p className="text-lg text-muted-foreground font-medium">
            Rated 4.9/5 by 10,000+ active trainers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow bg-white rounded-2xl p-2">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[15px] leading-relaxed text-neutral-700 italic mb-6">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center gap-4 mt-auto">
                  <ImageWithFallback
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full object-cover shadow-sm ring-2 ring-neutral-100"
                  />
                  <div>
                    <p className="text-sm font-bold text-neutral-900">
                      {testimonial.name}
                    </p>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      Pro Member
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 lg:py-20 max-w-6xl mx-auto mb-10">
        <Card className="bg-[#030213] text-white border-0 overflow-hidden relative shadow-2xl rounded-[32px]">
          {/* Abstract graphic */}
          <div className="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#534AB7]/40 to-transparent blur-3xl pointer-events-none"></div>
          
          <CardContent className="p-10 md:p-16 text-center z-10 relative">
             <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8 backdrop-blur-md">
                <Shield className="w-10 h-10 text-emerald-400" />
             </div>
            <h3 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight">
              Ready to Transform?
            </h3>
            <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto font-medium">
              Join thousands of users correcting their form and preventing injuries. Create your account in under a minute today.
            </p>
            <Button
              size="lg"
              className="bg-white text-[#030213] hover:bg-neutral-200 rounded-full px-10 py-7 text-lg font-bold transition-transform hover:scale-105 shadow-xl"
              onClick={onShowSignup}
            >
              Get Started Free
            </Button>
            <p className="text-[11px] uppercase tracking-widest font-bold text-white/50 mt-6">
              No credit card required • Infinite scaling
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-border/40 bg-neutral-50/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#030213] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">
                VS
              </span>
            </div>
            <span className="font-bold text-neutral-900">VyayamSaathi</span>
          </div>
          
          <div className="flex items-center gap-6 text-[13px] font-semibold text-muted-foreground">
            <button className="hover:text-neutral-900 transition-colors">Privacy</button>
            <button className="hover:text-neutral-900 transition-colors">Terms</button>
            <button className="hover:text-neutral-900 transition-colors">Safety</button>
            <button className="hover:text-neutral-900 transition-colors">Support</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
