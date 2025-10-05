/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-27T18:52:15-04:00
 * PURPOSE: Clean, user-focused landing page that clearly explains ModelCompare's value proposition.
 *          Simple design highlighting what users can do: compare AI models, battle them, debate topics.
 *          Focus on benefits and clear call-to-action, not technical implementation details.
 * SRP/DRY check: Pass - Single responsibility (landing page), minimal component reuse for simplicity
 * shadcn/ui: Pass - Uses core shadcn/ui components with clean, focused design
 */

import { Link } from "wouter";
import {
  Brain,
  Zap,
  ArrowRight,
  CheckCircle,
  MessageSquare,
  Users,
  Sparkles
} from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Custom components
import { AppNavigation } from "@/components/AppNavigation";

export default function Home() {
  const features = [
    {
      title: "Compare AI Models",
      description: "Ask the same question to multiple AI models and compare their responses side-by-side",
      icon: Brain,
      route: "/",
      color: "text-blue-500"
    },
    {
      title: "AI Model Battles",
      description: "Watch AI models debate each other in structured conversations",
      icon: MessageSquare,
      route: "/battle",
      color: "text-purple-500"
    },
    {
      title: "Debate Topics",
      description: "Set up formal debates between different AI models on any topic",
      icon: Users,
      route: "/debate",
      color: "text-green-500"
    }
  ];

  const benefits = [
    "Compare responses from GPT-5, Claude 4, Gemini 2.5, and more",
    "See which AI gives the best answer for your specific needs",
    "Test different prompting strategies across models",
    "Save time by getting multiple perspectives at once"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <AppNavigation
        title="ModelCompare"
        subtitle="AI Model Comparison Platform"
        icon={Brain}
      />

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-8">
            <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Compare AI Models
            <span className="text-blue-600 dark:text-blue-400"> Instantly</span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Get responses from multiple AI models side-by-side. See which one works best for your questions,
            coding problems, creative writing, and more.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
              <Link href="/">
                <Zap className="w-5 h-5 mr-2" />
                Start Comparing
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="px-8 py-3">
              <Link href="/billing">
                View Pricing
              </Link>
            </Button>
          </div>

          {/* Quick Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center text-left">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Choose Your Comparison Mode
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Different ways to explore and compare AI model capabilities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group cursor-pointer">
                <Link href={feature.route}>
                  <CardHeader className="text-center pb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 mb-4 group-hover:scale-110 transition-transform">
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      {feature.description}
                    </p>
                    <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
                      Try it now
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Models Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Compare Leading AI Models
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
            {[
              { name: "GPT-5", provider: "OpenAI", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
              { name: "Claude 4", provider: "Anthropic", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
              { name: "Gemini 2.5", provider: "Google", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
              { name: "Grok 4", provider: "xAI", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
              { name: "DeepSeek R1", provider: "DeepSeek", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" }
            ].map((model, index) => (
              <div key={index} className="text-center">
                <Badge className={`${model.color} mb-2 px-3 py-1`}>
                  {model.name}
                </Badge>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {model.provider}
                </div>
              </div>
            ))}
          </div>

          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
            <CardContent className="p-8">
              <div className="flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                  Ready to see the difference?
                </span>
              </div>
              <p className="text-blue-700 dark:text-blue-300 mb-6">
                Ask any question and see how different AI models respond. Compare their accuracy,
                creativity, coding ability, and reasoning skills.
              </p>
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/">
                  <Brain className="w-5 h-5 mr-2" />
                  Start Your First Comparison
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}