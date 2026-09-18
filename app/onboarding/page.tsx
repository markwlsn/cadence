'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

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
    <main className="min-h-dvh flex flex-col justify-between p-6 sm:p-12 max-w-xl mx-auto w-full">
      {/* Top Header & Skip */}
      <header className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] flex items-center justify-center font-bold text-[14px]">
            C
          </div>
          <span className="font-semibold text-[17px] tracking-tight">Cadence</span>
        </div>
        <button
          type="button"
          onClick={handleFinish}
          className="text-[14px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors py-1 px-2"
        >
          Skip
        </button>
      </header>

      {/* Main Content Card */}
      <section className="my-auto py-8">
        <span className="inline-block text-[13px] font-semibold text-[var(--color-text)] uppercase tracking-wider mb-3">
          {step.tag}
        </span>
        <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--color-text)] leading-tight mb-4">
          {step.title}
        </h1>
        <p className="text-[16px] sm:text-[18px] text-[var(--color-text-secondary)] leading-relaxed mb-8">
          {step.description}
        </p>

        {/* Feature Comparison / Highlights */}
        <div className="space-y-3">
          {step.detail.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3"
            >
              <span className="font-semibold text-[15px] text-[var(--color-text)] shrink-0">
                {item.label}:
              </span>
              <span className="text-[14px] text-[var(--color-text-secondary)]">
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Controls */}
      <footer className="flex flex-col gap-6 pb-6">
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2" aria-label="Step indicator">
          {steps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              aria-label={`Go to step ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'w-6 bg-[var(--color-text)]'
                  : 'w-2 bg-[var(--color-border-strong)] opacity-50 hover:opacity-100'
              }`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-3">
          {currentStep > 0 && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleBack}
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            onClick={handleNext}
            className="flex-1"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
          </Button>
        </div>
      </footer>
    </main>
  );
}
