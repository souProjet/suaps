'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';

interface StepContainerProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  onNext?: () => void;
  onPrevious?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  showNavigation?: boolean;
  className?: string;
}

export default function StepContainer({
  children,
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  nextDisabled = false,
  nextLabel = "Suivant",
  previousLabel = "Précédent",
  showNavigation = true,
  className = ""
}: StepContainerProps) {
  
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Content Area - Zone scrollable uniquement */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center p-3 sm:p-4 max-w-4xl mx-auto">
          {children}
        </div>
      </div>

      {/* Bottom Navigation - Fixed en bas */}
      {showNavigation && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-4xl mx-auto px-3 py-3 sm:px-4 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Previous Button */}
              <button
                onClick={onPrevious}
                disabled={isFirstStep}
                className={`
                  flex items-center space-x-1 sm:space-x-2 px-3 py-3 sm:px-4 sm:py-3 rounded-xl font-medium transition-all duration-200 touch-manipulation
                  ${isFirstStep 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100 active:scale-95 active:bg-gray-200'
                  }
                `}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">{previousLabel}</span>
              </button>

              {/* Step Counter */}
              <div className="flex items-center space-x-1 sm:space-x-2 text-sm text-gray-600">
                <div className="bg-gray-100 px-2 py-1 rounded-full">
                  <span className="font-bold">{currentStep}</span>
                  <span className="mx-1">/</span>
                  <span className="font-medium">{totalSteps}</span>
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={onNext}
                disabled={nextDisabled}
                className={`
                  flex items-center space-x-1 sm:space-x-2 px-4 py-3 sm:px-6 sm:py-3 rounded-xl font-medium transition-all duration-200 touch-manipulation min-w-[80px] sm:min-w-[100px] justify-center
                  ${nextDisabled 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : isLastStep
                      ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg active:scale-95 active:bg-green-700'
                      : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg active:scale-95 active:bg-blue-700'
                  }
                `}
              >
                <span className="text-sm">{isLastStep ? 'Terminer' : nextLabel}</span>
                {!isLastStep && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 