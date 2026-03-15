import { IconLoader3 } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSocket } from '@/context/socket-context';

interface PayeeProgress {
  id: string;
  name: string;
}

interface ProcessingJob {
  jobId: string;
  payee: PayeeProgress;
}

interface ProgressData {
  total: number;
  progress: number;
  percentage: number;
  processing?: ProcessingJob;
}

export function ProgressIndicator() {
  const socket = useSocket();
  const [progressData, setProgressData] = useState<ProgressData>({
    total: 0,
    progress: 0,
    percentage: 0,
  });
  const [status, setStatus] = useState<string>('Waiting for updates');

  useEffect(() => {
    if (!socket) return;

    // Add listener only once when component mounts
    const handleProgressUpdate = (data: {
      orgId: string;
      event: string;
      payload: ProgressData;
    }) => {
      if (data.payload) {
        setProgressData(data.payload);

        // Set status based on progress
        if (data.payload.processing?.payee) {
          setStatus(`Processing payee: ${data.payload.processing.payee.name}`);
        } else if (data.payload.percentage === 100) {
          setStatus('Completed');
        } else {
          setStatus('Processing...');
        }
      }
    };

    socket.on('payout:create_progress', handleProgressUpdate);

    // Cleanup listener when component unmounts
    return () => {
      socket.off('payout:create_progress', handleProgressUpdate);
    };
  }, [socket]);

  const isActiveProgress = useMemo(() => {
    return progressData.percentage > 0 && progressData.percentage < 100;
  }, [progressData.percentage]);

  if (!isActiveProgress) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='ghost' size='icon' title='Click to see progress'>
          <IconLoader3 className='animate-spin' />
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-125'>
        <DialogHeader>
          <DialogTitle>Payout Creation Progress</DialogTitle>
          <DialogDescription>View the current progress of payout creation.</DialogDescription>
        </DialogHeader>

        <ScrollArea className='max-h-100'>
          <div className='grid gap-4 pr-4'>
            {/* Progress Overview */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='font-medium'>Overall Progress:</span>
                <span className='font-semibold'>
                  {progressData.progress} / {progressData.total} ({progressData.percentage}%)
                </span>
              </div>

              <div className='relative w-full h-4 bg-gray-200 rounded overflow-hidden'>
                <div
                  className='absolute left-0 top-0 h-full bg-blue-500 transition-all duration-300'
                  style={{ width: `${progressData.percentage}%` }}
                />
              </div>
            </div>

            {/* Status */}
            <div className='space-y-1'>
              <p className='text-sm font-medium'>Status:</p>
              <p className='text-sm text-gray-600'>{status}</p>
            </div>

            {/* Current Processing Job */}
            {progressData.processing && (
              <div className='space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-md'>
                <p className='text-sm font-medium text-blue-900'>Currently Processing:</p>
                <div className='space-y-1'>
                  <div className='flex items-start justify-between text-xs'>
                    <span className='text-gray-600'>Job ID:</span>
                    <span className='font-mono text-gray-900 break-all ml-2'>
                      {progressData.processing.jobId}
                    </span>
                  </div>
                  {progressData.processing.payee && (
                    <>
                      <div className='flex items-start justify-between text-xs'>
                        <span className='text-gray-600'>Payee ID:</span>
                        <span className='font-mono text-gray-900 break-all ml-2'>
                          {progressData.processing.payee.id}
                        </span>
                      </div>
                      <div className='flex items-start justify-between text-xs'>
                        <span className='text-gray-600'>Payee Name:</span>
                        <span className='font-semibold text-gray-900 ml-2'>
                          {progressData.processing.payee.name}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
