import { cn } from '@/lib/utils';

export function VerticalStepper({
  steps,
  currentStep,
}: {
  steps: {
    title: string;
    description: string;
    icon: React.ElementType;
  }[];
  currentStep: number;
}) {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <aside className='flex justify-center items-center w-full h-full shadow-r border-r border-gray-200 dark:border-gray-700'>
      <ol className='relative text-gray-500 border-s border-gray-200 dark:border-gray-700 dark:text-gray-400'>
        {steps.map((step, index) => (
          <StepItem
            step={step}
            total={steps.length}
            key={index}
            index={index}
            currentStep={currentStep}
          />
        ))}
      </ol>
    </aside>
  );
}

const StepItem = ({
  step,
  total,
  index,
  currentStep,
}: {
  step: {
    title: string;
    description: string;
    icon: React.ElementType;
  };
  total: number;
  index: number;
  currentStep: number;
}) => (
  <li className={cn('ms-6', index !== total - 1 ? 'mb-10' : '')}>
    <span
      className={cn(
        'absolute flex items-center justify-center w-8 h-8 rounded-full -start-4 ring-4 ring-white dark:ring-gray-900',
        index < currentStep - 1 ? 'dark:bg-green-900 bg-green-200' : 'dark:bg-gray-700 bg-gray-100',
      )}
    >
      <step.icon
        className={cn(
          index < currentStep - 1
            ? 'text-green-500 dark:text-green-400'
            : 'text-gray-500 dark:text-gray-400',
        )}
        strokeWidth={2}
        size={20}
        color='currentColor'
      />
    </span>
    <h3 className='font-medium leading-tight'>{step.title}</h3>
    <p className='text-sm'>{step.description}</p>
  </li>
);
