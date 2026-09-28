import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'volt' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  block?: boolean;
  children?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-inverse text-on-inverse hover:opacity-90 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.45)]',
  volt: 'bg-volt-gradient text-volt-ink shadow-[0_10px_28px_-10px_rgba(22,211,154,0.8)] hover:brightness-105',
  secondary: 'bg-surface-2 text-ink hover:bg-surface-3',
  ghost: 'bg-transparent text-ink hover:bg-surface-2',
  outline: 'bg-transparent text-ink border border-line hover:bg-surface-2',
  danger: 'bg-danger/10 text-danger hover:bg-danger/15',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-xl',
  md: 'h-10 px-4 text-sm gap-2 rounded-2xl',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-2xl',
  xl: 'h-14 px-6 text-base gap-2.5 rounded-[20px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] transition-[background,opacity,filter] duration-200 disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      disabled={disabled}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </motion.button>
  );
});
