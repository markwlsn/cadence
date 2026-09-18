'use client';

import React from 'react';
import { SegmentedControl } from '@/components/ui';
import type { ReviewMode } from '@/types';

interface ModeToggleProps {
  mode: ReviewMode;
  onChange: (mode: ReviewMode) => void;
  disabled?: boolean;
}

export function ModeToggle({ mode, onChange, disabled = false }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <SegmentedControl<ReviewMode>
        name="review-mode"
        value={mode}
        onChange={(val) => !disabled && onChange(val)}
        options={[
          { value: 'mastery', label: 'Mastery' },
          { value: 'cram', label: 'Cram' },
        ]}
        size="sm"
        fullWidth={false}
        aria-label="Select study mode"
      />
    </div>
  );
}
