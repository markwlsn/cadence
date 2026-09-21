'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, CadenceLogo } from '@/components/ui';

interface OnboardingStep {
  tag: string;
  title: string;
  description: string;
  detail: { label: string; text: string }[];
}

const steps: OnboardingStep[] = [
  {
    tag: 'Welcome to Cadence',
    title: 'Study with rhythm, retain for life.',
    description:
      'Cadence adapts to how your brain naturally remembers. You review just before you forget — spending less time studying and keeping more in memory.',
    detail: [
      { label: 'Smart intervals', text: 'Cards appear based on how well you know them' },
      { label: 'Active recall', text: 'Test your confidence before seeing the answer' },
    ],
  },
  {
    tag: 'Two Ways to Study',
    title: 'Mastery Mode vs. Cram Mode',
    description:
      'Choose the approach that fits your deadline. Both are built directly into every deck.',
    detail: [
      {
        label: 'Mastery Mode',
        text: 'Optimal spaced repetition for long-term retention. Review only what is due today.',
      },
      {
        label: 'Cram Mode',
        text: 'Exam tomorrow? Review all cards immediately in high-intensity rapid cycles.',
      },
    ],
  },
  {
    tag: 'Ready',
    title: 'Transform notes into memory in seconds.',
    description:
      'Upload a lecture PDF, drop in photos of handwritten notes, or paste text. Cadence generates flashcards tailored to you.',
    detail: [
      { label: 'Multiple formats', text: 'Basic questions, fill-in-the-blanks, and multiple choice' },
      { label: 'Zero busywork', text: 'Automated card synthesis from your actual materials' },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const handleFinish = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cadence_onboarding_completed', 'true');
    }
    router.push('/');
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <main className="min-h-dvh flex flex-col justify-between p-4 sm:p-10 max-w-xl mx-auto w-full overflow-y-auto">
      {/* Top Header & Skip */}
      <header className="flex items-center justify-between pt-2 sm:pt-4 pb-2 shrink-0">
        <CadenceLogo size={30} showText />
        <button
          type="button"
          onClick={handleFinish}
          className="text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors py-2 px-3 min-h-[44px] flex items-center"
        >
          Skip
        </button>
      </header>

      {/* Main Content Card */}
      <section className="my-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div>
          <span className="inline-block text-[12px] sm:text-[13px] font-bold text-[var(--color-text)] uppercase tracking-wider mb-2">
            {step.tag}
          </span>
          <h1 className="text-[24px] sm:text-[32px] font-bold tracking-tight text-[var(--color-text)] leading-tight mb-3">
            {step.title}
          </h1>
          <p className="text-[14px] sm:text-[16px] text-[var(--color-text-secondary)] leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Feature Comparison / Highlights */}
        <div className="space-y-2.5 sm:space-y-3">
          {step.detail.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 sm:p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3"
            >
              <span className="font-semibold text-[14px] sm:text-[15px] text-[var(--color-text)] shrink-0">
                {item.label}:
              </span>
              <span className="text-[13px] sm:text-[14px] text-[var(--color-text-secondary)] leading-snug">
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Controls */}
      <footer className="flex flex-col gap-4 sm:gap-6 pb-6 pt-3 shrink-0">
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 py-1" aria-label="Step indicator">
          {steps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              aria-label={`Go to step ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentStep
                  ? 'w-6 bg-[var(--color-text)]'
                  : 'w-2 bg-[var(--color-border-strong)] opacity-50 hover:opacity-100'
              }`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-3 w-full">
          {currentStep > 0 && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleBack}
              className="flex-1 h-12 sm:h-14 text-[15px] font-semibold"
            >
              Back
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            onClick={handleNext}
            className="flex-1 h-12 sm:h-14 text-[15px] font-semibold shadow-md"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
          </Button>
        </div>
      </footer>
    </main>
  );
}
