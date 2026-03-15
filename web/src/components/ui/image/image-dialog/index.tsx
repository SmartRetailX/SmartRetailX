import { IconX } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ImagePopupProps {
  src: string;
  alt?: string;
}

export function ImageDialog({ src, alt }: ImagePopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fullImageLoaded, setFullImageLoaded] = useState(false);

  return (
    <>
      <div className='relative'>
        {!imageLoaded && <Skeleton className='w-full aspect-video rounded-md' />}
        <img
          src={src}
          alt={alt}
          onClick={() => setIsOpen(true)}
          className={`cursor-pointer w-full h-auto rounded-md hover:opacity-90 transition-opacity ${
            imageLoaded ? 'block' : 'hidden'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm'
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className='relative max-w-[80vw] max-h-[95vh] p-4'
              onClick={(e) => e.stopPropagation()}
            >
              {!fullImageLoaded && <Skeleton className='w-[80vw] h-[80vh] max-w-full max-h-full' />}
              <img
                src={src}
                alt={alt}
                className={`max-w-full max-h-full object-contain ${
                  fullImageLoaded ? 'block' : 'hidden'
                }`}
                onLoad={() => setFullImageLoaded(true)}
              />
              <Button
                variant='outline'
                size='icon'
                onClick={() => setIsOpen(false)}
                className='absolute top-0 right-[-15px] p-0 m-0 rounded-full bg-white/50 hover:bg-white/70 transition-colors'
                aria-label='Close'
              >
                <IconX stroke={2} className='text-accent-foreground' />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
