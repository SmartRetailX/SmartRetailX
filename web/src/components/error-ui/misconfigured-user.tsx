export const InvalidUserComponent = () => {
  return (
    <div className='flex flex-col items-center justify-center gap-4 text-center h-full'>
      <h1 className='text-2xl font-bold text-red-600'>Access Error</h1>
      <p className='text-gray-700 dark:text-gray-300'>
        Your user profile appears to be misconfigured.
      </p>
      <p className='text-gray-600 dark:text-gray-400'>
        Please contact support at{' '}
        <a href='mailto:support@example.com' className='text-blue-600 hover:underline'>
          support@royalty.com
        </a>
      </p>
    </div>
  );
};
