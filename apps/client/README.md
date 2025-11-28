# SmartRetailX Portal

A modern, high-performance e-commerce admin portal built with React, TypeScript,
and Rsbuild.

## 🚀 Tech Stack

### Core

- **React 19** - UI library with latest concurrent features
- **TypeScript 5** - Type-safe development
- **Rsbuild** - Lightning-fast build tool based on Rspack

### Routing & State

- **TanStack Router** - Type-safe file-based routing with advanced features
- **React Hook Form** - Performant form management
- **Zod** - Schema validation

### UI & Styling

- **Tailwind CSS 4** - Utility-first CSS with custom design system
- **Radix UI** - Unstyled, accessible component primitives
- **shadcn/ui** - Re-usable component library (New York style)
- **Lucide Icons** - Beautiful icon system
- **next-themes** - Dark mode support

### Code Quality

- **ESLint 9** - Modern linting with flat config
- **Prettier** - Opinionated code formatting
- **TypeScript Strict Mode** - Maximum type safety

## 📁 Project Structure

\`\`\` SmartRetailX-portal/ ├── .vscode/ # VSCode workspace settings ├──
public/ # Static assets ├── src/ │ ├── app.tsx # Root App component │ ├──
index.tsx # Application entry point │ ├── router.tsx # Router configuration │
├── components/ │ │ ├── ui/ # shadcn/ui components │ │ ├── states/ # Error
boundaries │ │ └── not-found/ # 404 page │ ├── hooks/ # Custom React hooks │ ├──
lib/ # Utility functions │ ├── routes/ # File-based routes │ │ ├──
\_\_root.tsx # Root route layout │ │ └── index.tsx # Home page │ ├── styles/ #
Global styles & CSS │ └── types/ # TypeScript type definitions ├──
.env.example # Environment variables template ├── rsbuild.config.ts # Rsbuild
configuration ├── tsconfig.json # TypeScript configuration └── package.json #
Dependencies & scripts \`\`\`

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

\`\`\`bash

# Install dependencies

pnpm install

# Copy environment variables

cp .env.example .env

# Start development server

pnpm dev \`\`\`

The app will be available at [http://localhost:3000](http://localhost:3000)

## 📜 Available Scripts

\`\`\`bash pnpm dev # Start dev server with HMR pnpm build # Production build
pnpm preview # Preview production build pnpm type-check # Run TypeScript
compiler checks pnpm lint # Lint code with ESLint pnpm lint:fix # Fix ESLint
issues automatically pnpm format # Format code with Prettier pnpm format:check #
Check code formatting pnpm check # Run all checks (type-check + lint + format)
\`\`\`

## 🎨 Design System

The project uses a custom design system built on Tailwind CSS with:

- **Color System**: OKLCH color space for better perceptual uniformity
- **Dark Mode**: Automatic theme switching with \`next-themes\`
- **Responsive**: Mobile-first approach with breakpoints
- **Accessible**: WCAG 2.1 AA compliant components

## 🔐 Authentication

The portal includes a type-safe authentication system:

- Auth context with TypeScript interfaces
- Token-based authentication (ready for API integration)
- Protected routes (configure in route files)
- Auth state management

## 🗂️ Routing

File-based routing powered by TanStack Router:

- **Type-safe routes** - Full TypeScript support
- **Auto code-splitting** - Optimized bundle sizes
- **Search params** - Type-safe URL search parameters
- **Loaders** - Data fetching before rendering

### Adding Routes

Create a new file in \`src/routes/\`: \`\`\`tsx // src/routes/products.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/products')({ component: ProductsPage, })

function ProductsPage() { return <div>Products</div> } \`\`\`

## 🧩 Components

### UI Components

Located in \`src/components/ui/\` - these are shadcn/ui components:

- Fully customizable
- Accessible by default
- Styled with Tailwind CSS
- TypeScript support

### Adding Components

\`\`\`bash

# Example: Add a new shadcn/ui component

npx shadcn@latest add dialog \`\`\`

## 🌐 Environment Variables

Configure in `.env`:

```bash
PUBLIC_API_BASE_URL=http://localhost:8000/api
PUBLIC_APP_NAME=SmartRetailX Portal
PUBLIC_ENABLE_DEVTOOLS=true
```

Access in code using the centralized config:

```typescript
import { env } from '@/lib/env';

const apiUrl = env.api.baseUrl;
const appName = env.app.name;
const isDevToolsEnabled = env.features.devtools;
```

**Note:** Rsbuild exposes environment variables with the `PUBLIC_` prefix to the
client-side code. All environment variables are managed through `src/lib/env.ts`
for type safety and centralized access.

## 📝 Code Standards

### TypeScript

- Strict mode enabled
- No implicit any
- Unused locals/parameters check
- Path aliases via \`@/\*\`

### Imports

Auto-sorted with prettier-plugin-sort-imports:

1. React imports
2. Third-party packages
3. Components, hooks, lib, utils
4. Styles
5. Relative imports

### Linting

- ESLint 9 flat config
- React Hooks rules
- Prettier integration

## 🚧 Development Guidelines

1. **Components**: Use functional components with hooks
2. **Styling**: Use Tailwind utility classes, avoid inline styles
3. **Types**: Define interfaces for all props and data structures
4. **Forms**: Use React Hook Form + Zod for validation
5. **State**: Keep state close to where it's used
6. **Naming**: Use descriptive names (components: PascalCase, functions:
   camelCase)

## 📦 Deployment

\`\`\`bash

# Build for production

pnpm build

# Output: dist/

# Deploy the dist folder to your hosting provider

\`\`\`

Recommended platforms:

- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront

## 📄 License

Private - Academic Research Project

## 🔗 Resources

- [Rsbuild Documentation](https://rsbuild.rs)
- [TanStack Router](https://tanstack.com/router)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [React Documentation](https://react.dev)
