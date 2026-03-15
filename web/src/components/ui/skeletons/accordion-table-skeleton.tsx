import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AccordionTableSkeletonProps {
  rows?: number;
}

export function AccordionTableSkeleton({ rows = 3 }: AccordionTableSkeletonProps) {
  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[300px]'>Track Title</TableHead>
            <TableHead>Payees</TableHead>
            <TableHead className='text-right'>Streams</TableHead>
            <TableHead className='text-right'>Downloads</TableHead>
            <TableHead className='text-right'>Sales</TableHead>
            <TableHead className='text-right'>Royalties</TableHead>
            <TableHead className='text-right'>Expenses</TableHead>
            <TableHead className='text-right'>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className='font-medium'>
                <div className='flex items-center'>
                  <Skeleton className='mr-2 h-4 w-4' />
                  <div className='flex items-center gap-2'>
                    <Skeleton className='h-8 w-8 rounded-md' />
                    <Skeleton className='h-4 w-32' />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className='flex items-center'>
                  <Skeleton className='h-4 w-4 mr-2' />
                  <Skeleton className='h-4 w-4' />
                </div>
              </TableCell>
              <TableCell className='text-right'>
                <Skeleton className='h-4 w-16 ml-auto' />
              </TableCell>
              <TableCell className='text-right'>
                <Skeleton className='h-4 w-16 ml-auto' />
              </TableCell>
              <TableCell className='text-right'>
                <Skeleton className='h-4 w-16 ml-auto' />
              </TableCell>
              <TableCell className='text-right'>
                <Skeleton className='h-4 w-20 ml-auto' />
              </TableCell>
              <TableCell className='text-right'>
                <Skeleton className='h-4 w-20 ml-auto' />
              </TableCell>
              <TableCell className='text-right'>
                <Skeleton className='h-4 w-20 ml-auto' />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
