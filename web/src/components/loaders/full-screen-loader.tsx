import '@/styles/loader.css';

export const FullScreenLoader = () => {
  return (
    <div className='fixed inset-0 z-[9999] bg-background flex items-center justify-center h-screen w-screen'>
      <div className='loader'></div>
    </div>
  );
};
