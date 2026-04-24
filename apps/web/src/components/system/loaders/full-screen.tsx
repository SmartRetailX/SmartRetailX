import '@/styles/loader.css';

export function FullScreenLoader() {
  return (
    <div className='fixed inset-0 flex items-center justify-center z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm'>
      <div className='loader'></div>
    </div>
  );
}
