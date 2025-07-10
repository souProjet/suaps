'use client';

import { Check, MapPin, Clock, Search, Target } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  current: boolean;
}

interface StepIndicatorProps {
  currentStep: number;
  steps: Step[];
}

export default function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-4xl mx-auto px-3 py-2 sm:px-4 sm:py-3">
        {/* Progress Bar */}
        <div className="relative mb-3 sm:mb-4">
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center relative">
                {/* Step Circle */}
                <div className={`
                  w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10 bg-white
                  ${step.completed 
                    ? 'border-green-500 bg-green-500 text-white shadow-lg' 
                    : step.current 
                      ? 'border-blue-500 bg-blue-500 text-white shadow-lg ring-2 ring-blue-100' 
                      : 'border-gray-300 text-gray-400'
                  }
                `}>
                  {step.completed ? (
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-current"></div>
                  )}
                </div>
                
                {/* Step Label - Only show on larger screens */}
                <div className="hidden sm:block mt-2 text-center">
                  <p className={`text-xs font-medium truncate ${
                    step.current ? 'text-blue-600' : step.completed ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Progress Line */}
          <div className="absolute top-3 sm:top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ 
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
              }}
            />
          </div>
        </div>

        {/* Current Step Info - Mobile optimized */}
        <div className="sm:hidden">
          {steps.map((step) => {
            if (!step.current) return null;
            return (
              <div key={step.id} className="flex items-center space-x-2 py-1">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  {step.icon}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">{step.title}</h2>
                  <p className="text-xs text-gray-600">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Step Info */}
        <div className="hidden sm:block text-center">
          {steps.map((step) => {
            if (!step.current) return null;
            return (
              <div key={step.id}>
                <h2 className="font-bold text-lg text-gray-900">{step.title}</h2>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 