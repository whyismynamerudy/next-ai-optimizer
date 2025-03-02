# Next.js AI Agent Optimization

This package provides a layer of optimization for Next.js applications to make them more accessible and navigable for AI agents. It automatically enhances components with semantic metadata, makes elements self-describing, and provides runtime helpers for AI agent interaction.

[![npm version](https://badge.fury.io/js/next-ai-optimizer.svg)](https://badge.fury.io/js/next-ai-optimizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Automated Component Enhancement**: Automatically adds data attributes for AI agent navigation
- **Semantic Metadata**: Adds semantic understanding to elements based on their purpose
- **Self-Documenting Elements**: Makes elements describe their purpose and interaction type
- **Runtime Element Detection**: Automatically detects interactive elements at runtime
- **Runtime Helpers**: Provides runtime APIs for AI agents to better navigate the application
- **Always-On AI Optimization**: Enabled by default for all users, no configuration required

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

### 3. Update TypeScript Configuration (if needed)

If you're using TypeScript and encounter module resolution issues, update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    // ... other options
  }
}
```

### 4. Enhance Individual Components

While the system automatically enhances all components during build, you can also manually enhance components for more granular control using `withAIEnhancement`.

#### Simple Components

For simple DOM-based components:

```javascript
import { withAIEnhancement } from 'next-ai-optimizer/react';

function SimpleButton({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
}

export default withAIEnhancement(SimpleButton, {
  name: 'SimpleButton',
  description: 'A button component that performs an action when clicked',
  interactionPoints: [
    {
      element: 'button',
      type: 'click',
      description: 'Click to perform the action'
    }
  ]
});
```

#### Complex Components with TypeScript

For complex components with TypeScript, especially those using refs:

```tsx
import { withAIEnhancement } from 'next-ai-optimizer/react';
import { useRef, useState } from 'react';

interface CardProps {
  title: string;
  description: string;
  imageUrl: string;
  onClick: () => void;
  aiMetadata?: any; // Important: include this to accept AI enhancement props
}

// Component that receives AI metadata
function Card({
  title,
  description,
  imageUrl,
  onClick,
  aiMetadata, // Accept the AI metadata props
}: CardProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    // Apply the ref to the root element
    <div ref={aiMetadata?.ref} className="card">
      <img 
        src={imageUrl} 
        alt={title} 
        id={`card-image-${title.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={onClick} 
      />
      <h3>{title}</h3>
      <p>{description}</p>
      <button 
        id={`expand-button-${title.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
      {expanded && (
        <div className="expanded-content">
          Additional content here...
        </div>
      )}
    </div>
  );
}

// Apply withAIEnhancement with appropriate selectors
export default withAIEnhancement(Card, {
  name: 'Card',
  description: 'A card component that displays information with expandable content',
  interactionPoints: [
    {
      element: 'img[id^="card-image"]',
      type: 'click',
      description: 'Click on the image to view details'
    },
    {
      element: 'button[id^="expand-button"]',
      type: 'click',
      description: 'Toggle expanded content visibility'
    }
  ]
});
```

#### Components with Forwarded Refs

If your component already uses `forwardRef`, integrate with `withAIEnhancement` like this:

```tsx
import React, { forwardRef } from 'react';
import { withAIEnhancement } from 'next-ai-optimizer/react';

interface InputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  aiMetadata?: any;
}

const FormInput = forwardRef<HTMLInputElement, InputProps>(({
  label,
  value,
  onChange,
  aiMetadata, // Accept AI metadata
}, ref) => {
  // Create a wrapper div that receives the AI metadata ref
  return (
    <div ref={aiMetadata?.ref} className="form-field">
      <label>{label}</label>
      <input
        ref={ref} // Pass the original ref to the input
        type="text"
        value={value}
        onChange={onChange}
        id={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
    </div>
  );
});

FormInput.displayName = 'FormInput'; // Important for React DevTools

export default withAIEnhancement(FormInput, {
  name: 'FormInput',
  description: 'A form input field with a label',
  interactionPoints: [
    {
      element: 'input[id^="input-"]',
      type: 'input',
      inputType: 'text',
      description: 'Enter text in this field'
    }
  ]
});
```

### Best Practices for Using withAIEnhancement

1. **Add Unique IDs**: Add predictable, unique IDs to your interactive elements to make them easier to select
   
2. **Handle the `aiMetadata` Prop**: For React components, make sure to accept and use the `aiMetadata` prop, applying its `ref` to your root element

3. **Use Specific Selectors**: Use specific CSS selectors in your `interactionPoints` configuration to ensure the correct elements are targeted

4. **Prefer ID-Based Selectors**: When possible, use ID-based selectors (e.g., `[id^="button-"]`) for more reliable element selection

5. **Describe Actions Clearly**: Use clear, descriptive text in your `description` fields to help AI agents understand each interaction

6. **Mark Flow Completion**: Use the `completes: true` property for interactions that complete a flow or process

## Configuration Options

You can configure the AI optimization through environment variables and props:

```
# Set the optimization level (basic, standard, advanced)
AI_OPTIMIZATION_LEVEL=standard
```

If you need to disable the AI optimization for certain scenarios:

```jsx
// Disable AI optimization
<AIAgentProvider disableOptimization={true}>
  {children}
</AIAgentProvider>
```

You can also disable it via URL parameter:

```
https://your-app.com/?ai-agent=false
```

## For AI Agents: How to Use Enhanced Pages

AI agents can use the following techniques to interact with optimized applications:

### 1. Detect AI Optimization

```javascript
// Check if the page is AI-optimized
const isOptimized = document.querySelector('html').hasAttribute('data-ai-optimized');
```

### 2. Access Page Metadata

```javascript
// Get page metadata
const metadata = JSON.parse(document.getElementById('ai-page-metadata')?.textContent || '{}');
```

### 3. Find Elements by Purpose

```javascript
// Find elements by their purpose
const submitButton = document.querySelector('[data-ai-action="click"][data-ai-target*="submit"]');
```

### 4. Use Global Helper Functions

```javascript
// Access global helper functions
if (window.AIHelper) {
  const interactiveElements = window.AIHelper.getInteractiveElements();
  const element = window.AIHelper.findElement('contact-form-submit');
}

// Or use the more advanced helpers if available
if (window.__AI_AGENT_HELPERS__) {
  const element = window.__AI_AGENT_HELPERS__.findElement('contact-form-submit');
  const description = window.__AI_AGENT_HELPERS__.describeElement(element);
  
  // Perform interactions
  window.__AI_AGENT_HELPERS__.clickElement('submit-button');
  window.__AI_AGENT_HELPERS__.fillInput('name-field', 'John Doe');
}
```

## Understanding the Generated Metadata

When a component is enhanced with `withAIEnhancement`, it generates HTML with metadata attributes:

```html
<!-- Component-level metadata -->
<div 
  data-ai-component="ComponentName" 
  data-ai-target="component-ComponentName" 
  data-ai-description="Component description" 
  data-ai-interaction-points="[...]">

  <!-- Interactive elements with their own metadata -->
  <button 
    data-ai-action="click" 
    data-ai-description="Button description"
    data-ai-target="ComponentName-click-abc123">
    Click Me
  </button>
  
  <input 
    data-ai-action="input" 
    data-ai-input-type="text"
    data-ai-description="Input description"
    data-ai-target="ComponentName-input-def456">
</div>
```

This metadata makes your components self-documenting for AI agents.

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
  export function AIAgentProvider(props: { children: any, disableOptimization?: boolean }): JSX.Element;
  export function AIAgentAssistant(): JSX.Element;
  export function useAIAgentInteraction(): any;
  export function AIAgentDebugger(): JSX.Element;
  export function withAIEnhancement(component: any, options?: any): any;
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

#### Issues with withAIEnhancement

If your enhanced components don't show AI metadata:

1. Make sure you're accepting and using the `aiMetadata` prop
2. Apply the `ref` from `aiMetadata` to your root element
3. Use ID-based selectors for more reliable element targeting
4. Check the console for any warnings from the AI optimizer

## How It Works

### Build-time Optimization

During the build process, the system:

1. Analyzes React components using Babel
2. Adds semantic data attributes to elements
3. Enriches the HTML document with AI-friendly metadata
4. Makes all interactive elements self-documenting

### Runtime Assistance

At runtime, the system:

1. Enables AI optimization for all users by default
2. Injects helper functions to facilitate AI agent interaction
3. Provides element lookup and interaction functions
4. Captures and identifies interactive elements automatically
5. Enhances newly added elements in single-page applications

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