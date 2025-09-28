/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-27T18:45:23-04:00
 * PURPOSE: Dazzling landing page that showcases all ModelCompare capabilities using existing components.
 *          Features animated hero section, interactive mode cards, component gallery, and billing previews.
 *          Leverages full shadcn/ui library and custom components for maximum visual impact.
 * SRP/DRY check: Pass - Single responsibility (landing page showcase), reuses all existing components extensively
 * shadcn/ui: Pass - Extensively uses shadcn/ui components with custom styling for visual effects
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Brain,
  Zap,
  MessageSquare,
  Swords,
  Scale,
  Palette,
  Search,
  FileText,
  ArrowRight,
  Sparkles,
  Bot,
  Users,
  TrendingUp,
  Shield,
  Globe,
  Star
} from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// Custom components
import { AppNavigation } from "@/components/AppNavigation";
import { ModelButton } from "@/components/ModelButton";
import { ResponseCard } from "@/components/ResponseCard";
import { CreditBalance } from "@/components/CreditBalance";
import { PricingTable } from "@/components/PricingTable";

// Dashboard components
import { ArcGrid } from "@/components/dashboard/ArcGrid";
import { BioCard } from "@/components/dashboard/BioCard";
import { ChessBoard } from "@/components/dashboard/ChessBoard";
import { LiveCounter } from "@/components/dashboard/LiveCounter";
import { QuantumMetrics } from "@/components/dashboard/QuantumMetrics";

// Types
import type { AIModel } from "@/types/ai-models";

// Animation keyframes in CSS-in-JS style
const animationStyles = `
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
  50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.8); }
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes tilt-in {
  0% { transform: rotateX(20deg) rotateY(20deg) scale(0.9); opacity: 0; }
  100% { transform: rotateX(0deg) rotateY(0deg) scale(1); opacity: 1; }
}

.float-animation { animation: float 6s ease-in-out infinite; }
.pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
.gradient-shift {
  background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #f5576c, #4facfe, #00f2fe);
  background-size: 400% 400%;
  animation: gradient-shift 15s ease infinite;
}
.tilt-card {
  animation: tilt-in 0.6s ease-out forwards;
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
}
.tilt-card:hover { transform: rotateX(5deg) rotateY(5deg) scale(1.05); }
`;

export default function Home() {
  const [typedText, setTypedText] = useState("");
  const [currentModeIndex, setCurrentModeIndex] = useState(0);

  const fullText = "Compare AI Models Like Never Before";
  const modes = [
    {
      name: "Compare",
      icon: Brain,
      route: "/compare",
      description: "Side-by-side AI model comparison",
      color: "from-blue-500 to-cyan-500",
      preview: "Ask any question and see how different AI models respond"
    },
    {
      name: "Battle Chat",
      icon: Swords,
      route: "/battle",
      description: "Interactive model conversations",
      color: "from-red-500 to-pink-500",
      preview: "Watch AI models debate and challenge each other"
    },
    {
      name: "Debate",
      icon: Scale,
      route: "/debate",
      description: "Structured model debates",
      color: "from-purple-500 to-indigo-500",
      preview: "10-round debates on any topic with scoring"
    },
    {
      name: "Creative Combat",
      icon: Palette,
      route: "/creative-combat",
      description: "Collaborative content creation",
      color: "from-green-500 to-teal-500",
      preview: "Models build on each other's creative work"
    },
    {
      name: "Research Synthesis",
      icon: Search,
      route: "/research-synthesis",
      description: "Multi-model research collaboration",
      color: "from-orange-500 to-yellow-500",
      preview: "Advanced research workflows with variable systems"
    },
    {
      name: "Vixra Papers",
      icon: FileText,
      route: "/vixra",
      description: "Satirical academic paper generation",
      color: "from-violet-500 to-purple-500",
      preview: "Generate hilarious fake research papers"
    }
  ];

  // Fetch sample models for preview
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<AIModel[]>;
    },
  });

  // Typing animation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typedText.length < fullText.length) {
        setTypedText(fullText.slice(0, typedText.length + 1));
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [typedText, fullText]);

  // Cycle through modes for preview
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentModeIndex((prev) => (prev + 1) % modes.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [modes.length]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <AppNavigation
          title="ModelCompare"
          subtitle="AI Model Comparison Platform"
          icon={Brain}
        />

        {/* Floating Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 float-animation">
            <Brain className="w-8 h-8 text-blue-400/30" />
          </div>
          <div className="absolute top-40 right-20 float-animation" style={{ animationDelay: '2s' }}>
            <Zap className="w-6 h-6 text-purple-400/30" />
          </div>
          <div className="absolute bottom-40 left-20 float-animation" style={{ animationDelay: '4s' }}>
            <Sparkles className="w-10 h-10 text-cyan-400/30" />
          </div>
          <div className="absolute bottom-20 right-10 float-animation" style={{ animationDelay: '1s' }}>
            <Bot className="w-7 h-7 text-green-400/30" />
          </div>
        </div>

        <div className="relative z-10">
          {/* Hero Section */}
          <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto text-center">
              {/* Main Hero Card */}
              <Card className="mx-auto max-w-4xl backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
                <CardContent className="p-12">
                  <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-shift mb-6 pulse-glow">
                      <Brain className="w-10 h-10 text-white" />
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6">
                      <span className="gradient-shift bg-clip-text text-transparent">
                        {typedText}
                      </span>
                      <span className="animate-pulse">|</span>
                    </h1>

                    <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                      The ultimate platform for comparing, battling, and collaborating with AI models.
                      Experience the power of multiple AI providers in one unified interface.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold pulse-glow">
                      <Link href="/compare">
                        <Zap className="w-5 h-5 mr-2" />
                        Start Comparing Now
                      </Link>
                    </Button>

                    <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg">
                      <Link href="/battle">
                        <Swords className="w-5 h-5 mr-2" />
                        Watch AI Battle
                      </Link>
                    </Button>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-8 border-t border-white/20">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{models.length}+</div>
                      <div className="text-sm text-gray-400">AI Models</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">6</div>
                      <div className="text-sm text-gray-400">Comparison Modes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">5</div>
                      <div className="text-sm text-gray-400">AI Providers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">∞</div>
                      <div className="text-sm text-gray-400">Possibilities</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Mode Showcase Grid */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4">
                  Powerful AI Comparison Modes
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Choose from multiple specialized modes designed for different AI interaction scenarios
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {modes.map((mode, index) => (
                  <Card
                    key={mode.name}
                    className={`tilt-card backdrop-blur-xl bg-white/10 border-white/20 hover:bg-white/20 transition-all duration-300 group cursor-pointer`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <Link href={mode.route}>
                      <CardHeader className="pb-4">
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r ${mode.color} mb-4 group-hover:scale-110 transition-transform`}>
                          <mode.icon className="w-6 h-6 text-white" />
                        </div>
                        <CardTitle className="text-white text-xl group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300">
                          {mode.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300 mb-4">{mode.description}</p>
                        <p className="text-sm text-gray-400 mb-4">{mode.preview}</p>
                        <div className="flex items-center text-blue-400 group-hover:text-blue-300">
                          <span className="text-sm font-medium">Try it now</span>
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Live Component Gallery */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black/20 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4">
                  See Our Components in Action
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Experience the power of our reusable component system
                </p>
              </div>

              <Tabs defaultValue="models" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/10 backdrop-blur-xl">
                  <TabsTrigger value="models" className="text-white data-[state=active]:bg-white/20">
                    AI Models
                  </TabsTrigger>
                  <TabsTrigger value="dashboard" className="text-white data-[state=active]:bg-white/20">
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="billing" className="text-white data-[state=active]:bg-white/20">
                    Billing
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="models" className="space-y-6">
                  <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Brain className="w-5 h-5 mr-2" />
                        Model Selection Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {modelsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[...Array(6)].map((_, i) => (
                            <Skeleton key={i} className="h-20 bg-white/20" />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {models.slice(0, 6).map((model) => (
                            <ModelButton
                              key={model.id}
                              model={model}
                              isSelected={false}
                              isAnalyzing={false}
                              responseCount={0}
                              onToggle={() => {}}
                              disabled={true}
                              showTiming={true}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="dashboard" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white">Live Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <QuantumMetrics />
                      </CardContent>
                    </Card>

                    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white">Real-time Counter</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <LiveCounter />
                      </CardContent>
                    </Card>

                    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white">Interactive Chess</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChessBoard />
                      </CardContent>
                    </Card>

                    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white">ARC Puzzle Grid</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ArcGrid />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="billing" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white">Credit Balance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CreditBalance />
                      </CardContent>
                    </Card>

                    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white">Pricing Plans</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PricingTable />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {/* Feature Highlights */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4">
                  Why Choose ModelCompare?
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Card className="tilt-card backdrop-blur-xl bg-white/10 border-white/20 text-center">
                  <CardContent className="p-6">
                    <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-white font-semibold mb-2">Multiple Providers</h3>
                    <p className="text-gray-300 text-sm">OpenAI, Anthropic, Google, xAI, DeepSeek</p>
                  </CardContent>
                </Card>

                <Card className="tilt-card backdrop-blur-xl bg-white/10 border-white/20 text-center">
                  <CardContent className="p-6">
                    <TrendingUp className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-white font-semibold mb-2">Real-time Streaming</h3>
                    <p className="text-gray-300 text-sm">Live responses as models generate</p>
                  </CardContent>
                </Card>

                <Card className="tilt-card backdrop-blur-xl bg-white/10 border-white/20 text-center">
                  <CardContent className="p-6">
                    <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-white font-semibold mb-2">Secure & Private</h3>
                    <p className="text-gray-300 text-sm">Your data stays private and secure</p>
                  </CardContent>
                </Card>

                <Card className="tilt-card backdrop-blur-xl bg-white/10 border-white/20 text-center">
                  <CardContent className="p-6">
                    <Globe className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                    <h3 className="text-white font-semibold mb-2">Advanced Features</h3>
                    <p className="text-gray-300 text-sm">Debates, battles, creative collaboration</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                <CardContent className="p-12">
                  <h2 className="text-4xl font-bold text-white mb-6">
                    Ready to Experience the Future of AI?
                  </h2>
                  <p className="text-xl text-gray-300 mb-8">
                    Join thousands of users comparing and collaborating with AI models
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg pulse-glow">
                      <Link href="/compare">
                        <Star className="w-5 h-5 mr-2" />
                        Start Your Journey
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}