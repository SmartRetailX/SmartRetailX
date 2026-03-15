import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Array of background colors for avatars
const avatarColors = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-cyan-500',
];

export type AvatarUser = {
  _id: string;
  name: string;
  email?: string;
  image?: string | null;
};

export interface AvatarStackProps {
  users: AvatarUser[];
  maxAvatars?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  tooltipContent?: (user: AvatarUser) => React.ReactNode;
  ringColor?: string;
}

export function AvatarStack({
  users,
  maxAvatars = 3,
  size = 'md',
  showTooltip = true,
  tooltipContent,
  ringColor = 'ring-background',
}: AvatarStackProps) {
  if (!users || users.length === 0) return null;

  // Determine avatar size class
  const sizeClass = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }[size];

  // Calculate how many users to display and how many are remaining
  const totalUsers = users.length;
  const displayUsers = users.slice(0, maxAvatars);
  const remainingUsers = totalUsers > maxAvatars ? totalUsers - maxAvatars : 0;

  // Default tooltip content if not provided
  const defaultTooltipContent = (user: AvatarUser) => (
    <>
      <p>{user?.name}</p>
      {user?.email && <p className='text-xs text-muted-foreground'>{user?.email}</p>}
    </>
  );

  // Function to get color based on user ID
  const getUserColor = (userId: string) => {
    if (!userId || typeof userId !== 'string' || userId.length === 0) {
      return avatarColors[0]; // Return default color if userId is invalid
    }
    const colorIndex = userId.charCodeAt(0) % avatarColors.length;
    return avatarColors[colorIndex];
  };

  return (
    <div className='flex items-center'>
      <div className='flex -space-x-2'>
        {displayUsers.map((user) => {
          // Safety check for user object
          if (!user || !user._id || !user.name) {
            return null;
          }

          const avatarColor = getUserColor(user._id);
          const name = user?.name;

          const avatarComponent = (
            <Avatar className={`${sizeClass} ring-2 ${ringColor}`}>
              {user.image ? (
                <AvatarImage src={user.image} alt={name} />
              ) : (
                <AvatarFallback className={avatarColor}>{name?.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
          );

          if (showTooltip) {
            return (
              <TooltipProvider key={user._id}>
                <Tooltip>
                  <TooltipTrigger asChild>{avatarComponent}</TooltipTrigger>
                  <TooltipContent>
                    {tooltipContent ? tooltipContent(user) : defaultTooltipContent(user)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return <div key={user._id}>{avatarComponent}</div>;
        })}

        {remainingUsers > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className={`${sizeClass} ring-2 ${ringColor} bg-gray-500`}>
                  <AvatarFallback>+{remainingUsers}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{`${remainingUsers} more user${remainingUsers > 1 ? 's' : ''}`}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
