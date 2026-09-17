import React from 'react';

type CardElevation = 'flat' | 'raised' | 'floating';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  as?: 'div' | 'article' | 'section' | 'li';
}

const elevationStyles: Record<CardElevation, string> = {
  flat: 'bg-[var(--color-surface)] border border-[var(--color-border)]',
  raised: 'bg-[var(--color-surface-raised)] shadow-[var(--shadow-sm)]',
  floating: 'bg-[var(--color-surface-raised)] shadow-[var(--shadow-md)]',
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  elevation = 'raised',
  padding = 'md',
  children,
  className = '',
  as: Tag = 'div',
  ...props
}: CardProps) {
  // Cast needed because TypeScript cannot narrow the union of HTML element
  // attribute types for a runtime-polymorphic `as` prop without a dedicated
  // overload set. Chat 1 (Frontend) should replace this with a proper
  // polymorphic component utility when implementing the full design system.
  const TagAny = Tag as React.ElementType;
  return (
    <TagAny
      className={[
        'rounded-[var(--radius-lg)] overflow-hidden',
        elevationStyles[elevation],
        paddingStyles[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      {children}
    </TagAny>
  );
}
