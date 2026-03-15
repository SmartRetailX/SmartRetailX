import { IconCalendar, IconChevronDown } from '@tabler/icons-react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useGetSeasons } from '@/queries/season';
import { useSeasonStore } from '@/store/season.store';
import { Season } from '@/types/season';
import { formatDate } from '@/utils/date-time';
import { resolveSeasonRange } from '@/utils/season-range';

export function SeasonChanger() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: seasons, isLoading } = useGetSeasons();
  const { setActiveSeason, getActiveSeason, setSeasonRange, getSeasonRange } = useSeasonStore();

  // Get active single season and range selection for current pathname
  const activeSeasonId = getActiveSeason(pathname);
  const seasonRangeSelection = getSeasonRange(pathname);

  // Sort seasons by date range (latest first for UI list)
  const sortedSeasonsDesc = useMemo(() => {
    if (!seasons || seasons.length === 0) return [];
    return [...seasons].sort((a, b) => {
      // Sort by 'to' date descending (latest first)
      const bDate = b.dateRange.to ? new Date(b.dateRange.to).getTime() : new Date().getTime();
      const aDate = a.dateRange.to ? new Date(a.dateRange.to).getTime() : new Date().getTime();
      return bDate - aDate;
    });
  }, [seasons]);

  const resolvedSeasonRange = useMemo(() => {
    return resolveSeasonRange(seasons || [], seasonRangeSelection, activeSeasonId);
  }, [seasons, seasonRangeSelection, activeSeasonId]);

  const selectedSeasonIds = useMemo(() => {
    return new Set(resolvedSeasonRange.selectedSeasons.map((season) => season._id));
  }, [resolvedSeasonRange.selectedSeasons]);

  const applySingleSeasonSelection = (seasonId: string) => {
    setSeasonRange(pathname, { fromSeasonId: seasonId, toSeasonId: seasonId });
    setActiveSeason(pathname, seasonId);
  };

  // Handle season boundary selection:
  // first click = first boundary, second click = second boundary (includes seasons in-between)
  const handleSeasonToggle = (season: Season) => {
    const currentFromId =
      seasonRangeSelection?.fromSeasonId ||
      seasonRangeSelection?.toSeasonId ||
      activeSeasonId ||
      null;
    const currentToId =
      seasonRangeSelection?.toSeasonId || seasonRangeSelection?.fromSeasonId || currentFromId;

    if (!currentFromId || !currentToId) {
      applySingleSeasonSelection(season._id);
      return;
    }

    const isRangeSelected = currentFromId !== currentToId;

    if (!isRangeSelected) {
      if (season._id === currentFromId) {
        applySingleSeasonSelection(season._id);
        return;
      }

      setSeasonRange(pathname, {
        fromSeasonId: currentFromId,
        toSeasonId: season._id,
      });
      return;
    }

    // If clicking one of the current boundaries, collapse to the other boundary.
    if (season._id === currentFromId || season._id === currentToId) {
      const remainingBoundary = season._id === currentFromId ? currentToId : currentFromId;
      applySingleSeasonSelection(remainingBoundary);
      return;
    }

    // Start a fresh range from clicked season.
    applySingleSeasonSelection(season._id);
  };

  const handleSelectLatestSeason = () => {
    if (!sortedSeasonsDesc.length) return;
    applySingleSeasonSelection(sortedSeasonsDesc[0]._id);
  };

  // Navigate to settings if no seasons
  const handleCreateSeason = () => {
    navigate({
      to: '/settings',
      search: { option: 'seasons' },
    });
  };

  // Format season display text
  const getSeasonDisplayText = () => {
    const { fromSeason, toSeason, selectedSeasons } = resolvedSeasonRange;

    if (!fromSeason || !toSeason) return 'No Season';

    if (selectedSeasons.length <= 1) {
      return fromSeason.name;
    }

    return `${fromSeason.name} to ${toSeason.name}`;
  };

  // Format season date range for dropdown items
  const getSeasonDateRange = (season: Season) => {
    const from = formatDate(season.dateRange.from, 'MMM dd, yyyy');
    const to = season.dateRange.to ? formatDate(season.dateRange.to, 'MMM dd, yyyy') : 'Present';
    return `${from} - ${to}`;
  };

  // Format selected season range for trigger title
  const getSelectedRangeDateSummary = () => {
    const fromSeason = resolvedSeasonRange.fromSeason;
    const toSeason = resolvedSeasonRange.toSeason;

    if (!fromSeason || !toSeason) return 'Select season range';

    const from = formatDate(fromSeason.dateRange.from, 'MMM dd, yyyy');
    const to = toSeason.dateRange.to
      ? formatDate(toSeason.dateRange.to, 'MMM dd, yyyy')
      : 'Present';
    const seasonCount = resolvedSeasonRange.selectedSeasons.length;
    const seasonLabel = seasonCount === 1 ? 'season' : 'seasons';

    return `${seasonCount} ${seasonLabel} • ${from} - ${to}`;
  };

  if (!pathname.startsWith('/payments')) {
    return null;
  }

  if (isLoading) {
    return (
      <Button variant='outline' className='flex items-center gap-2' disabled>
        <IconCalendar className='h-4 w-4' />
        <span>Loading...</span>
      </Button>
    );
  }

  // If no seasons, show create button
  if (!sortedSeasonsDesc || sortedSeasonsDesc.length === 0) {
    return (
      <Button
        variant='outline'
        className='flex items-center gap-2'
        onClick={handleCreateSeason}
        title='No Season, Please create a season'
      >
        <IconCalendar className='h-4 w-4' />
        <span>No Season</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size={'sm'}
          className={cn('flex items-center gap-2 min-w-45 justify-between')}
          title={getSelectedRangeDateSummary()}
        >
          <div className='flex items-center gap-2'>
            <IconCalendar className='h-4 w-4' />
            <span className='truncate'>{getSeasonDisplayText()}</span>
          </div>
          <IconChevronDown className='h-4 w-4 opacity-50' />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-62.5'>
        <DropdownMenuLabel>Select Season Range</DropdownMenuLabel>
        <p className='px-2 pb-1 text-xs text-muted-foreground'>
          Pick one season, or pick two boundary seasons to include everything in-between.
        </p>
        <DropdownMenuSeparator />

        {sortedSeasonsDesc.map((season) => (
          <DropdownMenuCheckboxItem
            key={season._id}
            checked={selectedSeasonIds.has(season._id)}
            onCheckedChange={() => handleSeasonToggle(season)}
            onSelect={(event) => event.preventDefault()}
            className={cn('cursor-pointer', {
              'bg-accent': selectedSeasonIds.has(season._id),
            })}
          >
            <div className='flex flex-col gap-1 w-full'>
              <div className='flex items-center justify-between'>
                <span className='font-medium'>{season.name}</span>
                {season.closed && <span className='text-xs text-muted-foreground'>(Closed)</span>}
              </div>
              <span className='text-xs text-muted-foreground'>{getSeasonDateRange(season)}</span>
            </div>
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSelectLatestSeason} className='cursor-pointer'>
          <span className='text-sm'>Use Latest Season</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleCreateSeason} className='cursor-pointer'>
          <span className='text-sm'>Manage Seasons</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
