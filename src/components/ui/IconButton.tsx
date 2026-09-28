import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  label: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export function IconButton({ label, children, size = 'md', active, className, ...rest }: Props) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.92 }}
      whileHover={{ y: -1 }}
      className={cn(
        'glass inline-flex items-center justify-center rounded-2xl text-ink transition-colors',
        size === 'sm' && 'size-9',
        size === 'md' && 'size-11',
        size === 'lg' && 'size-12',
        active && 'bg-inverse text-on-inverse',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
