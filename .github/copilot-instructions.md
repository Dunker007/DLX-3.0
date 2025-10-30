# Copilot Instructions for DLX Co-Pilot 3.0

## Project Overview

**DLX Co-Pilot 3.0** is a self-hosted AI web creation studio and strategic partner. It integrates Google Gemini's multi-modal capabilities for:
- Interactive chat with multiple modes (Standard, Low Latency, Deep Analysis, Web Search, Maps)
- Vision analysis and image generation
- Code generation and project creation
- Real-time voice conversation
- Story writing and documentation
- Feature flag management

This serves as a comprehensive command center for developers and operators.

## Technology Stack

- **Frontend Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 6.2.0
- **AI Integration**: Google Gemini API (@google/genai)
- **Code Editor**: Monaco Editor
- **Testing**: Vitest 4.0.5

## Project Structure

```
/
├── .github/              # GitHub configuration
├── components/           # React components (modules for each feature)
├── hooks/               # Custom React hooks (e.g., useDebounce)
├── services/            # API and business logic services
│   ├── geminiService.ts    # Main Gemini API integration
│   ├── storyWriterService.ts
│   ├── featureFlagService.ts
│   └── ...
├── util/                # Helper utilities
├── types.ts             # TypeScript type definitions
├── App.tsx              # Main application component
├── index.tsx            # Application entry point
└── vite.config.ts       # Vite configuration
```

## Development Workflow

### Setup
```bash
npm install
```

### Running the App
```bash
npm run dev
```
The app will be available at `http://localhost:5173` (default Vite port).

### Building
```bash
npm run build
```
Build output goes to the `dist/` directory.

### Testing
```bash
npx vitest
```
- Tests are located alongside the source files with `.test.ts` or `.test.tsx` extensions
- Currently, there is minimal test coverage - focus on testing services and critical logic

## Code Style Guidelines

### TypeScript
- Use TypeScript for all new files
- Leverage type safety - avoid `any` types
- Define types in `types.ts` for shared types
- Use enums for fixed sets of values (see `ModuleType`, `ChatMode`, `EntryType`, etc.)

### React
- Use functional components with hooks
- Use lazy loading for modules/routes (`React.lazy()`)
- Wrap lazy-loaded components in `<Suspense>` with appropriate fallbacks
- Use `ErrorBoundary` for error handling
- Follow the existing component naming convention (e.g., `ChatModule`, `VisionModule`)

### Component Organization
- Each major feature is a "Module" (e.g., `ChatModule.tsx`, `VisionModule.tsx`)
- Shared components go in the `components/` directory
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks in `hooks/`

### Services
- API interactions and business logic belong in `services/`
- Each service should have a clear, focused responsibility
- Add tests for service logic (use Vitest)
- Handle errors gracefully and provide meaningful error messages

### Styling
- Use Tailwind CSS utility classes (already configured)
- Follow the existing dark theme color scheme (gray-900 background, gray-300 text)
- Maintain responsive design (use `md:`, `lg:` breakpoints as needed)
- Keep the sidebar navigation pattern for new modules

## Environment Configuration

- **Required**: `GEMINI_API_KEY` must be set in `.env.local` for AI features to work
- The app uses Vite's environment variable handling (access via `import.meta.env.VITE_*`)

## Best Practices for This Repository

### When Adding New Features
1. Create a new module component in `components/` (e.g., `NewFeatureModule.tsx`)
2. Add the module type to the `ModuleType` enum in `types.ts`
3. Register the lazy-loaded component in `App.tsx`
4. Add the module to the switch statement in `renderModule()`
5. Update the sidebar in `components/Sidebar.tsx` to include the new module

### When Working with Gemini API
- Use the existing `geminiService.ts` for all Gemini interactions
- Handle streaming responses appropriately
- Implement proper error handling for API failures
- Be mindful of API rate limits and quotas

### When Adding Dependencies
- Keep dependencies minimal - prefer built-in solutions
- Check if functionality already exists in the project before adding new packages
- Update `package.json` using `npm install <package>`

### Testing Guidelines
- Write tests for complex service logic
- Test error handling paths
- Use Vitest's assertion library
- Run tests before committing changes with significant logic updates

## Common Tasks

### Adding a New AI Mode
1. Add the mode to the `ChatMode` enum in `types.ts`
2. Update `ChatModule.tsx` to handle the new mode
3. Extend `geminiService.ts` if special API handling is needed

### Creating a New Module
1. Create `components/NewModule.tsx`
2. Add lazy import in `App.tsx`
3. Add to `ModuleType` enum
4. Update `Sidebar.tsx`
5. Add appropriate icon from `components/icons.tsx`

### Working with Feature Flags
- Feature flags are managed via `featureFlagService.ts`
- States: `active`, `preview`, `labs`, `comingSoon`, `inactive`, `disabled`
- Check flags before rendering experimental features

## What to Avoid

- Don't commit the `.env.local` file (contains API keys)
- Don't add heavy dependencies without justification
- Avoid mixing business logic in React components - use services
- Don't break the existing module structure or navigation patterns
- Avoid inline styles - use Tailwind classes

## Useful Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npx vitest

# Run tests in watch mode
npx vitest --watch
```

## Additional Context

This is an AI Studio app that was originally scaffolded from Google AI Studio. The app emphasizes:
- Multi-modal AI interactions
- Developer productivity tools
- Self-hosting capabilities
- Extensible module architecture

When making changes, maintain the professional, developer-focused aesthetic and ensure all new features integrate seamlessly with the existing module system.
