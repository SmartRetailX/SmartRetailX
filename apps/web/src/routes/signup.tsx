import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/signup')({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: '/$auth',
      params: { auth: 'sign-up' },
      search: {
        redirect: location.href,
      },
      replace: true,
    });
  },
});
