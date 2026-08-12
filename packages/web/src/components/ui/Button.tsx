import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-purple-700 text-white hover:bg-purple-800 disabled:bg-purple-300',
  secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 disabled:text-neutral-400',
  ghost: 'bg-transparent text-purple-700 hover:bg-purple-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className = '', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
});
