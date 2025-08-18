import { Card, CardContent } from "@/components/ui/card";
import { AppNavigation } from "@/components/AppNavigation";
import { Users, Clock } from "lucide-react";

export default function ResearchSynthesis() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppNavigation 
        title="Research Synthesis"
        subtitle="Collaborative multi-model research synthesis"
        icon={Users}
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Clock className="h-16 w-16 text-blue-500" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Coming Soon</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                Research Synthesis Mode is currently under development. This mode will enable 
                collaborative multi-model research synthesis with specialized expertise roles.
              </p>
              <div className="mt-8 text-sm text-gray-500 dark:text-gray-500">
                <p>Features in development:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Multi-round research synthesis</li>
                  <li>• Specialized expertise roles (literature reviewer, methodologist, etc.)</li>
                  <li>• Configurable research depth and methodology</li>
                  <li>• Evidence level validation</li>
                  <li>• Academic discipline lens selection</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}