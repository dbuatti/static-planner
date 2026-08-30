# AI Rules for React App

## Tech Stack
- React 18 with TypeScript for type-safe component development
- React Router v6 for client-side routing (routes defined in src/App.tsx)
- Tailwind CSS for utility-first styling
- shadcn/ui component library (built on Radix UI) for pre-built, accessible components
- Lucide React for consistent icons
- Vite as the build tool and development server
- ESLint and Prettier for code formatting and linting
- Radix UI primitives (via shadcn/ui) for unstyled, accessible behavior

## Library Usage Rules
- **shadcn/ui**: Use shadcn/ui components for all common UI elements (buttons, inputs, modals, tabs, etc.). Do not recreate these from scratch. If customization is needed, create wrapper components in src/components/ rather than editing shadcn/ui files.
- **Icons**: Import icons exclusively from `lucide-react`. Use specific icon imports (e.g., `import { LucideIcon } from 'lucide-react'`) to keep bundle size small.
- **Styling**: Apply Tailwind CSS classes for layout, spacing, colors, typography, shadows, and responsive design. Avoid writing custom CSS or CSS-in-JS unless absolutely necessary (and then only with approval).
- **Routing**: Define all application routes in src/App.tsx using React Router v6. Use `<Route>` elements and keep route definitions centralized. Use `<Link>` for navigation and the `useNavigate` hook for programmatic navigation.
- **File Organization**: Place page components in src/pages/ and reusable, non-page components in src/components/. Follow this structure strictly.
- **TypeScript**: Use TypeScript interfaces and types for all props, state, and API responses. Avoid the `any` type; use `unknown` with type guards when needed.
- **State Management**: For simple component state, use React's `useState` or `useReducer`. For global state, prefer React Context or Zustand if introduced; do not add Redux or other heavy state libraries without explicit approval.
- **Data Fetching**: If data fetching is needed, use React Query (TanStack Query) or the built-in `fetch` API with `useEffect`. Do not add additional data-fetching libraries without approval.
- **Dependencies**: Do not install additional UI libraries (e.g., Material-UI, Ant Design, Chakra UI) beyond the approved stack (shadcn/ui, Tailwind, Lucide) without explicit team approval.