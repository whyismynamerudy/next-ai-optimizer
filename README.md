# Next.js AI Agent Optimization

This package provides a layer of optimization for Next.js applications to make them more accessible and navigable for AI agents. It automatically enhances components with semantic metadata, creates a component map, and provides runtime helpers for AI agent interaction.

## Features

- **Automated Component Enhancement**: Automatically adds data attributes for AI agent navigation
- **Semantic Metadata**: Adds semantic understanding to elements based on their purpose
- **Component Registry**: Generates a machine-readable map of components and their functions
- **Runtime Element Detection**: Automatically detects and maps interactive elements at runtime
- **LLM Integration**: Optional LLM-powered enhancements for improved semantic understanding
- **Runtime Helpers**: Provides runtime APIs for AI agents to better navigate the application

## Installation

```bash
npm install next-ai-optimizer
# or
yarn add next-ai-optimizer
```

## Complete Setup Guide

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

#### For Pages Router:

```javascript
// pages/_app.js (Pages Router)
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

#### For App Router:

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

#### For TypeScript App Router:

If you're using TypeScript with the App Router, you might need to use a type assertion:

```tsx
// app/layout.tsx (App Router with TypeScript)
import { AIAgentProvider } from 'next-ai-optimizer/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AIAgentProvider>
          {children as any}
        </AIAgentProvider>
      </body>
    </html>
  );
}
```

### 3. Create API Route for Component Map Updates

This step is crucial for the runtime component mapping system to work properly.

#### For App Router:

Create the file `app/api/ai-component-map/update/route.js` (or `.ts`):

```javascript
// app/api/ai-component-map/update/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    // Parse the request body
    const data = await request.json();
    
    // Validate the payload
    if (!data || (!data.components && !data.runtimeElements)) {
      return NextResponse.json(
        { error: 'Invalid component map data' },
        { status: 400 }
      );
    }
    
    // Add timestamp
    data.generatedAt = new Date().toISOString();
    
    // Define the output path (in the public directory)
    const publicDir = path.join(process.cwd(), 'public');
    const outputPath = path.join(publicDir, 'ai-component-map.json');
    
    // Create the public directory if it doesn't exist
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Check if a previous map exists
    let existingMap = {};
    if (fs.existsSync(outputPath)) {
      try {
        const existingData = fs.readFileSync(outputPath, 'utf8');
        existingMap = JSON.parse(existingData);
      } catch (err) {
        console.warn('Could not read existing component map:', err.message);
      }
    }
    
    // Merge with existing data, preserving build-time components
    const mergedMap = {
      components: existingMap.components || [],
      runtimeElements: data.runtimeElements || [],
      generatedAt: data.generatedAt,
      version: data.version || '1.0.0',
      pageContexts: {
        ...(existingMap.pageContexts || {}),
        [data.currentPath || '/']: {
          lastUpdated: new Date().toISOString(),
          elementsCount: (data.runtimeElements || []).length
        }
      }
    };
    
    // Write the updated map to the file
    fs.writeFileSync(outputPath, JSON.stringify(mergedMap, null, 2));
    
    return NextResponse.json({ 
      success: true,
      message: 'Component map updated successfully'
    });
  } catch (error) {
    console.error('Error updating component map:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update component map',
        message: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const outputPath = path.join(process.cwd(), 'public', 'ai-component-map.json');
    
    if (!fs.existsSync(outputPath)) {
      return NextResponse.json({
        components: [],
        runtimeElements: [],
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      });
    }
    
    const mapData = fs.readFileSync(outputPath, 'utf8');
    const componentMap = JSON.parse(mapData);
    
    return NextResponse.json(componentMap);
  } catch (error) {
    console.error('Error retrieving component map:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve component map' },
      { status: 500 }
    );
  }
}
```

#### For Pages Router:

Create the file `pages/api/ai-component-map/update.js` (or `.ts`):

```javascript
// pages/api/ai-component-map/update.js
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Only allow POST and GET requests
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  if (req.method === 'GET') {
    // Handle GET request to retrieve the component map
    try {
      const outputPath = path.join(process.cwd(), 'public', 'ai-component-map.json');
      
      if (!fs.existsSync(outputPath)) {
        return res.status(200).json({
          components: [],
          runtimeElements: [],
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        });
      }
      
      const mapData = fs.readFileSync(outputPath, 'utf8');
      const componentMap = JSON.parse(mapData);
      
      return res.status(200).json(componentMap);
    } catch (error) {
      console.error('Error retrieving component map:', error);
      return res.status(500).json({ error: 'Failed to retrieve component map' });
    }
  } else {
    // Handle POST request to update the component map
    try {
      const data = req.body;
      
      // Validate the payload
      if (!data || (!data.components && !data.runtimeElements)) {
        return res.status(400).json({ error: 'Invalid component map data' });
      }
      
      // Add timestamp
      data.generatedAt = new Date().toISOString();
      
      // Define the output path (in the public directory)
      const publicDir = path.join(process.cwd(), 'public');
      const outputPath = path.join(publicDir, 'ai-component-map.json');
      
      // Create the public directory if it doesn't exist
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      
      // Check if a previous map exists
      let existingMap = {};
      if (fs.existsSync(outputPath)) {
        try {
          const existingData = fs.readFileSync(outputPath, 'utf8');
          existingMap = JSON.parse(existingData);
        } catch (err) {
          console.warn('Could not read existing component map:', err.message);
        }
      }
      
      // Merge with existing data, preserving build-time components
      const mergedMap = {
        components: existingMap.components || [],
        runtimeElements: data.runtimeElements || [],
        generatedAt: data.generatedAt,
        version: data.version || '1.0.0',
        pageContexts: {
          ...(existingMap.pageContexts || {}),
          [req.headers.referer || '/']: {
            lastUpdated: new Date().toISOString(),
            elementsCount: (data.runtimeElements || []).length
          }
        }
      };
      
      // Write the updated map to the file
      fs.writeFileSync(outputPath, JSON.stringify(mergedMap, null, 2));
      
      return res.status(200).json({ 
        success: true, 
        message: 'Component map updated successfully'
      });
    } catch (error) {
      console.error('Error updating component map:', error);
      return res.status(500).json({ 
        error: 'Failed to update component map',
        message: error.message
      });
    }
  }
}
```

### 4. Update TypeScript Configuration (if needed)

If you're using TypeScript and encounter module resolution issues, update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    // ... other options
  }
}
```

### 5. (Optional) Enhance Individual Components

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

### 6. (Optional) Use Component Map Hooks

You can use the `useComponentMap` hook to interact with the component map system:

```javascript
import { useComponentMap } from 'next-ai-optimizer/react';

function AIDebugPanel() {
  const { 
    elementRegistry, 
    captureElements, 
    updateComponentMap 
  } = useComponentMap();
  
  return (
    <div>
      <h3>AI Component Debug</h3>
      <p>Detected {Object.keys(elementRegistry).length} interactive elements</p>
      <button 
        onClick={() => {
          captureElements();
          updateComponentMap();
        }}
      >
        Refresh Component Map
      </button>
    </div>
  );
}
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
  
  // Perform interactions
  helpers.captureElements(); // Refresh the element registry
  helpers.updateComponentMap(); // Update the component map file
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
    "moduleResolution": "bundler",
    // or
    "moduleResolution": "node16"
  }
}
```

2. If the error persists, create type declarations in your project:

```typescript
// src/@types/next-ai-optimizer/index.d.ts
declare module 'next-ai-optimizer/react' {
  import React from 'react';
  export function AIAgentProvider(props: { children: any }): JSX.Element;
  export function AIAgentAssistant(): JSX.Element;
  export function useAIAgentInteraction(): any;
  export function AIAgentDebugger(): JSX.Element;
  export function withAIEnhancement(component: any, options?: any): any;
  export function useComponentMap(): any;
  export function updateComponentMap(): Promise<boolean>;
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

### API Route Issues

If you encounter errors with the component map updates:

1. Make sure you've created the API route exactly as shown in the setup guide
2. Check that the route is accessible by manually visiting `/api/ai-component-map/update` in your browser
3. Verify that your application has write permissions to the `/public` directory

### Missing Component Map

If you see a 404 error when loading `/ai-component-map.json`:

1. Make sure your Next.js configuration is correctly set up with the AI optimizer
2. Manually trigger a component map update by adding `?ai-agent=true` to your URL and refreshing the page
3. Ensure the API route for updates is properly implemented and accessible

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
4. Captures and maps interactive elements automatically
5. Updates the component map when navigating between pages
6. Enhances newly added elements in single-page applications

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