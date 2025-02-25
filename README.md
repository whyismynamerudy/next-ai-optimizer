# Next.js AI Agent Optimization

This package provides a layer of optimization for Next.js applications to make them more accessible and navigable for AI agents. It automatically enhances components with semantic metadata, creates a component map, and provides runtime helpers for AI agent interaction.

## Features

- **Automated Component Enhancement**: Automatically adds data attributes for AI agent navigation
- **Semantic Metadata**: Adds semantic understanding to elements based on their purpose
- **Component Registry**: Generates a machine-readable map of components and their functions
- **LLM Integration**: Optional LLM-powered enhancements for improved semantic understanding
- **Zero-Config Setup**: Works out-of-the-box with minimal configuration
- **Runtime Helpers**: Provides runtime APIs for AI agents to better navigate the application

## Installation

```bash
npm install next-ai-optimizer
# or
yarn add next-ai-optimizer
```

## Setup

### 1. Update your Next.js configuration

Add the AI optimizer to your `next.config.js`:

```javascript
// next.config.js
const { withAIOptimizer } = require('next-ai-optimizer');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js configuration
};

module.exports = withAIOptimizer(nextConfig);
```

### 2. Wrap your application with the AI Agent Provider

In your `_app.js` or `app/layout.js`:

```javascript
// _app.js (Pages Router)
import { AIAgentProvider } from 'next-ai-optimizer/react';

function MyApp({ Component, pageProps }) {
  return (
    <AIAgentProvider>
      <Component {...pageProps} />
    </AIAgentProvider>
  );
}

export default MyApp;
```

Or for App Router:

```javascript
// app/layout.js (App Router)
import { AIAgentProvider } from 'next-ai-optimizer/react';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AIAgentProvider>
          {children}
        </AIAgentProvider>
      </body>
    </html>
  );
}
```

### 3. (Optional) Enhance individual components

While the system automatically enhances all components during build, you can also manually enhance components for more granular control:

```javascript
import { withAIEnhancement } from 'next-ai-optimizer/react';

function MyComponent() {
  // Your component implementation
}

export default withAIEnhancement(MyComponent, {
  name: 'MyComponent',
  description: 'A component that does something specific',
  interactionPoints: [
    {
      element: 'button.primary',
      type: 'click',
      description: 'Submit the form'
    }
  ]
});
```

## Configuration Options

You can configure the AI optimization through environment variables:

```
# Enable optimization even in development mode
OPTIMIZE_FOR_AI=true

# Set the optimization level (basic, standard, advanced)
AI_OPTIMIZATION_LEVEL=standard

# Enable LLM-powered enhancements (requires API key)
OPENAI_API_KEY=your-api-key
```

## For AI Agents: How to Use Enhanced Pages

AI agents can use the following techniques to better navigate optimized applications:

### 1. Detect AI Optimization

```javascript
// Check if the page is AI-optimized
const isOptimized = document.querySelector('html').hasAttribute('data-ai-optimized');
```

### 2. Access Component Map

```javascript
// Fetch the component map
async function getComponentMap() {
  const response = await fetch('/ai-component-map.json');
  return await response.json();
}
```

### 3. Find Elements by Purpose

```javascript
// Find elements by their purpose
const submitButton = document.querySelector('[data-ai-action="click"][data-ai-target*="submit"]');
```

### 4. Use Global Helper Functions

```javascript
// Access global helper functions if available
const helpers = window.__AI_AGENT_HELPERS__;
if (helpers) {
  const interactiveElements = helpers.getInteractiveElements();
  const element = helpers.findElement('contact-form-submit');
  const description = helpers.describeElement(element);
}
```

## Troubleshooting

### TypeScript Type Errors

#### Module Not Found

If you see the error `Cannot find module 'next-ai-optimizer/react' or its corresponding type declarations`:

1. Make sure your TypeScript configuration has the right module resolution:

```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node16",
    // or
    "moduleResolution": "bundler"
  }
}
```

2. If the error persists, create type declarations in your project:

```typescript
// src/@types/next-ai-optimizer/index.d.ts
declare module 'next-ai-optimizer/react' {
  import React from 'react';
  export function AIAgentProvider(props: { children: any }): JSX.Element;
  // Add other exports as needed
}
```

#### ReactNode Type Mismatch

If you see an error like `Type 'React.ReactNode' is not assignable to type 'import("...").ReactNode'`:

Use a type assertion to resolve React version incompatibilities:

```jsx
<AIAgentProvider>
  {children as any}
</AIAgentProvider>
```

### Missing Component Map

If you see a 404 error when loading `/ai-component-map.json`:

1. Make sure your Next.js configuration is correctly set up with the AI optimizer
2. Run a production build with `npm run build` to generate the component map
3. If the issue persists, manually create a basic component map:

```json
// public/ai-component-map.json
{
  "components": [],
  "generatedAt": "2025-02-24T12:00:00.000Z",
  "version": "1.0.0"
}
```

### Babel Plugin Not Working

If you see `[AI Optimizer] No components were registered. Make sure the babel plugin is configured correctly`:

1. Ensure your Next.js configuration correctly applies the AI optimizer
2. Set the `OPTIMIZE_FOR_AI=true` environment variable
3. Try rebuilding the project with a production build (`npm run build`)

### Enabling AI Agent Detection

To ensure AI agent detection works properly:

1. Add the `?ai-agent=true` URL parameter to explicitly identify as an AI agent
2. Alternatively, modify the `AIAgentProvider` to always treat users as AI agents:

```jsx
// In your layout file
<AIAgentProvider forceOptimization={true}>
  {children as any}
</AIAgentProvider>
```

## How It Works

### Build-time Optimization

During the build process, the system:

1. Analyzes React components using Babel
2. Adds semantic data attributes to elements
3. Generates a component map for AI agent navigation
4. Optionally enhances component metadata using LLM analysis

### Runtime Assistance

At runtime, the system:

1. Detects if the current user is likely an AI agent
2. Injects additional helpers when AI agents are detected
3. Provides a component registry and element lookup functions
4. Enhances newly added elements in single-page applications

## Examples

### Example: Form Automation

An AI agent can automate form filling by:

```javascript
// Find the form
const form = document.querySelector('[data-ai-interaction="form-submission"]');

// Find inputs by their type
const nameInput = form.querySelector('[data-ai-input-type="text"][name="name"]');
const emailInput = form.querySelector('[data-ai-input-type="email"]');

// Fill the form
nameInput.value = 'John Doe';
emailInput.value = 'john@example.com';

// Submit the form
const submitButton = form.querySelector('[data-ai-action="click"][data-ai-target="contact-form-submit"]');
submitButton.click();
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT