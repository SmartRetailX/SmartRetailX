export const FallbackComponent = ({ error }: { error: Error }) => {
  return (
    <div
      role='alert'
      className='flex flex-col justify-center items-center w-full min-h-[calc(100vh-var(--header-height))] mt-(--header-height) p-4'
    >
      <p>Something went wrong:</p>
      <pre style={{ color: 'red' }}>{error.message}</pre>
    </div>
  );
};
