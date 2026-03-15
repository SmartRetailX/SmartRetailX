import { Stepper } from './stepper';

export function HorizontalStepper({
  steps,
  currentStep,
  className,
}: {
  steps: {
    title: string;
    description: string;
    icon: React.ElementType;
  }[];
  currentStep: number;
  className?: string;
}) {
  if (!steps || steps.length === 0) {
    return null;
  }

  return <Stepper steps={steps} currentStep={currentStep - 1} className={className} />;
}
