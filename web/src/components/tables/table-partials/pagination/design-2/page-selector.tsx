import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useState } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

export function VirtualizedPageSelect({
  value,
  pageCount,
  onChange,
  height = 240,
}: {
  value: number; // 1-based page
  pageCount: number;
  onChange: (page: number) => void;
  height?: number;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const rowVirtualizer = useVirtualizer({
    count: pageCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 5,
  });

  // Scroll to current page when opened
  useEffect(() => {
    if (isOpen && value && pageCount > 0) {
      setTimeout(() => {
        const index = value - 1;
        rowVirtualizer.scrollToIndex(index, { align: 'center' });
      }, 100);
    }
  }, [isOpen, value, pageCount, rowVirtualizer]);

  // Fallback to simple rendering if pageCount is reasonable
  if (pageCount <= 100) {
    return (
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger size='default' />

        <SelectContent style={{ maxHeight: height }}>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
            <SelectItem key={page} value={String(page)}>
              Page {page}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger size='default' />

      <SelectContent className='p-0'>
        <div ref={scrollRef} style={{ height, overflow: 'auto' }}>
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              position: 'relative',
              width: '100%',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const page = vi.index + 1;
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vi.start}px)`,
                    height: vi.size,
                  }}
                >
                  <SelectItem value={String(page)}>Page {page}</SelectItem>
                </div>
              );
            })}
          </div>
        </div>
      </SelectContent>
    </Select>
  );
}
