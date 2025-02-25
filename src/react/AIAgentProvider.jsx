'use client';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

// Create a context for AI agent information
const AIAgentContext = createContext({
  isAIAgent: true, // Default to true
  elementRegistry: {},
  findTargetElement: () => null,
});

/**
 * Provider component that sets up AI agent optimization
 * AI optimization is enabled by default
 */
export function AIAgentProvider({ children, disableOptimization = false }) {
  const [isAIAgent, setIsAIAgent] = useState(true); // Default to true
  const [elementRegistry, setElementRegistry] = useState({});
  const isCapturing = useRef(false);
  const previousUrl = useRef('');
  
  // Check if AI optimization should be disabled explicitly
  useEffect(() => {
    const checkOptOut = () => {
      // Check for explicit opt-out URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const optOut = urlParams.get('ai-agent') === 'false';
      
      // Set isAIAgent to false only if disabled by prop or explicit opt-out
      if (disableOptimization || optOut) {
        setIsAIAgent(false);
      }
    };
    
    checkOptOut();
  }, [disableOptimization]);

  // Function to capture all interactive elements on the page
  const captureInteractiveElements = () => {
    if (isCapturing.current) return; // Prevent concurrent captures
    isCapturing.current = true;
    
    const interactiveSelectors = [
      'button', 
      'a', 
      'input', 
      'select', 
      'textarea', 
      '[role="button"]', 
      '[role="link"]', 
      '[role="checkbox"]', 
      '[role="radio"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[data-ai-action]'
    ];
    
    const elements = document.querySelectorAll(interactiveSelectors.join(','));
    const newRegistry = {};
    
    elements.forEach(element => {
      // Skip hidden or non-interactive elements
      if (!isElementVisible(element) || !isElementInteractable(element)) {
        return;
      }
      
      // Generate a target ID if not present
      let aiTarget = element.getAttribute('data-ai-target');
      if (!aiTarget) {
        aiTarget = generateTargetId(element);
        element.setAttribute('data-ai-target', aiTarget);
      }
      
      // Determine the interaction type if not set
      let aiAction = element.getAttribute('data-ai-action');
      if (!aiAction) {
        aiAction = determineInteractionType(element);
        element.setAttribute('data-ai-action', aiAction);
      }
      
      // Extract component context
      const aiComponent = element.closest('[data-ai-component]')?.getAttribute('data-ai-component') || null;
      
      // Calculate position and dimensions
      const rect = element.getBoundingClientRect();
      const viewportPosition = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      };
      
      // Collect key attributes
      const attributes = {};
      for (const attr of element.attributes) {
        attributes[attr.name] = attr.value;
      }
      
      // Simplified content representation
      const content = element.textContent?.trim().substring(0, 50) || '';
      
      // Compute path for more reliable targeting
      const path = computeElementPath(element);
      
      // Create element info object
      const elementInfo = {
        aiTarget,
        aiAction,
        aiComponent,
        tagName: element.tagName.toLowerCase(),
        type: element.getAttribute('type') || undefined,
        id: element.id || undefined,
        className: element.className || undefined,
        name: element.getAttribute('name') || undefined,
        value: element.value || undefined,
        href: element.getAttribute('href') || undefined,
        path,
        content,
        viewportPosition,
        attributes,
        timestamp: Date.now()
      };
      
      newRegistry[aiTarget] = elementInfo;
    });
    
    // Update the registry
    setElementRegistry(newRegistry);
    isCapturing.current = false;
    
    return Object.values(newRegistry);
  };
  
  // Compute a CSS selector path for an element
  function computeElementPath(element) {
    const path = [];
    let currentNode = element;
    
    while (currentNode && currentNode !== document.body && currentNode !== document) {
      let selector = currentNode.tagName.toLowerCase();
      
      // Add ID if present (makes selector more specific)
      if (currentNode.id) {
        selector += `#${currentNode.id}`;
        path.unshift(selector);
        break; // ID is unique, so we can stop here
      }
      
      // Add classes for more specificity
      if (currentNode.className) {
        const classNames = currentNode.className.split(/\s+/).filter(Boolean);
        if (classNames.length > 0) {
          selector += `.${classNames.join('.')}`;
        }
      }
      
      // Add position if needed
      const siblings = Array.from(currentNode.parentNode?.children || [])
        .filter(child => child.tagName === currentNode.tagName);
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(currentNode) + 1;
        selector += `:nth-child(${index})`;
      }
      
      path.unshift(selector);
      currentNode = currentNode.parentNode;
    }
    
    return path.join(' > ');
  }
  
  // Determine the type of interaction an element supports
  function determineInteractionType(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type')?.toLowerCase();
    
    switch (tagName) {
      case 'button':
      case 'a':
      case 'summary':
        return 'click';
        
      case 'input':
        if (type === 'checkbox' || type === 'radio') {
          return 'click';
        } else if (type === 'submit' || type === 'button' || type === 'reset') {
          return 'click';
        } else {
          return 'input';
        }
        
      case 'select':
        return 'select';
        
      case 'textarea':
        return 'input';
        
      default:
        // Check roles
        const role = element.getAttribute('role')?.toLowerCase();
        if (role === 'button' || role === 'link' || role === 'checkbox' || role === 'radio') {
          return 'click';
        }
        
        // Check event listeners as a fallback (only works for inline handlers)
        if (element.hasAttribute('onclick') || element.hasAttribute('onClick')) {
          return 'click';
        }
        
        // Default to click for anything with cursor: pointer
        const computedStyle = window.getComputedStyle(element);
        if (computedStyle.cursor === 'pointer') {
          return 'click';
        }
        
        return 'interact'; // Generic fallback
    }
  }
  
  // Function to find an element by its AI target
  const findTargetElement = (targetValue) => {
    return document.querySelector(`[data-ai-target="${targetValue}"]`);
  };

  // Listen for navigation changes (including client-side navigation)
  useEffect(() => {
    if (!isAIAgent) return;
    
    // Initial capture - do immediately since we're always optimizing
    captureInteractiveElements();
    
    // Function to handle URL changes (for SPA navigation)
    const handleUrlChange = () => {
      const currentUrl = window.location.href;
      if (previousUrl.current !== currentUrl) {
        previousUrl.current = currentUrl;
        
        // Wait for the new page to render
        setTimeout(() => {
          captureInteractiveElements();
        }, 500); // Reduced delay since we're always optimizing
      }
    };
    
    // Set up listeners for different navigation methods
    window.addEventListener('popstate', handleUrlChange);
    
    // Intercept history methods
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleUrlChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleUrlChange();
    };
    
    // Set up a MutationObserver to detect DOM changes
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            
            // Check if this is an interactive element or contains one
            if (
              node.matches && (
                node.matches(interactiveSelectors.join(',')) || 
                node.querySelector && node.querySelector(interactiveSelectors.join(','))
              )
            ) {
              shouldUpdate = true;
              break;
            }
          }
        } else if (mutation.type === 'attributes') {
          // If an important attribute changed on an interactive element
          const targetElement = mutation.target;
          if (
            targetElement.nodeType === Node.ELEMENT_NODE && 
            targetElement.matches && 
            targetElement.matches(interactiveSelectors.join(','))
          ) {
            shouldUpdate = true;
            break;
          }
        }
      }
      
      if (shouldUpdate) {
        // Debounce updates to avoid excessive processing
        if (window.aiUpdateTimeout) {
          clearTimeout(window.aiUpdateTimeout);
        }
        
        window.aiUpdateTimeout = setTimeout(() => {
          captureInteractiveElements();
        }, 500);
      }
    });
    
    const interactiveSelectors = [
      'button', 
      'a', 
      'input', 
      'select', 
      'textarea', 
      '[role="button"]', 
      '[role="link"]', 
      '[role="checkbox"]', 
      '[role="radio"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[data-ai-action]'
    ];
    
    // Start observing the document
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'style', 'class']
    });
    
    // Set up periodic refresh just in case
    const refreshInterval = setInterval(() => {
      captureInteractiveElements();
    }, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(refreshInterval);
      if (window.aiUpdateTimeout) {
        clearTimeout(window.aiUpdateTimeout);
      }
      
      observer.disconnect();
      window.removeEventListener('popstate', handleUrlChange);
      
      // Restore original history methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [isAIAgent]);
  
  // Add global helper for AI agents if in browser
  useEffect(() => {
    if (typeof window !== 'undefined' && isAIAgent) {
      window.__AI_AGENT_HELPERS__ = {
        findElement: findTargetElement,
        getInteractiveElements: () => Object.values(elementRegistry),
        captureElements: captureInteractiveElements,
        describeElement: (element) => {
          if (!element) return null;
          
          const aiTarget = element.getAttribute('data-ai-target');
          // If we have this element in our registry, return that info
          if (aiTarget && elementRegistry[aiTarget]) {
            return elementRegistry[aiTarget];
          }
          
          // Otherwise generate description on the fly
          return {
            aiTarget: aiTarget,
            aiAction: element.getAttribute('data-ai-action'),
            aiComponent: element.closest('[data-ai-component]')?.getAttribute('data-ai-component'),
            tagName: element.tagName.toLowerCase(),
            text: element.textContent?.trim(),
            id: element.id,
            classNames: element.className,
            type: element.getAttribute('type') || undefined,
            ariaLabel: element.getAttribute('aria-label') || undefined,
            visible: isElementVisible(element),
            interactable: isElementInteractable(element),
            path: computeElementPath(element)
          };
        },
        // Helper methods for AI agents
        clickElement: (targetOrSelector) => {
          let element = typeof targetOrSelector === 'string'
            ? document.querySelector(`[data-ai-target="${targetOrSelector}"]`) || document.querySelector(targetOrSelector)
            : targetOrSelector;
            
          if (element && isElementInteractable(element)) {
            element.click();
            return true;
          }
          return false;
        },
        fillInput: (targetOrSelector, value) => {
          let element = typeof targetOrSelector === 'string'
            ? document.querySelector(`[data-ai-target="${targetOrSelector}"]`) || document.querySelector(targetOrSelector)
            : targetOrSelector;
            
          if (element && isElementInteractable(element)) {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        }
      };
    }
  }, [isAIAgent, elementRegistry]);
  
  return (
    <AIAgentContext.Provider 
      value={{
        isAIAgent,
        elementRegistry,
        findTargetElement,
        captureElements: captureInteractiveElements
      }}
    >
      {children}
      {isAIAgent && <AIAgentHelperScript />}
    </AIAgentContext.Provider>
  );
}

// Helper component to inject initialization script
function AIAgentHelperScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            // Signal that the AI helper is ready
            window.AI_HELPER_READY = true;
            
            // Update page metadata for AI agents
            const metadata = {
              url: window.location.href,
              title: document.title,
              description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
              interactiveElements: Array.from(document.querySelectorAll('[data-ai-action]')).length
            };
            
            // Add metadata to document head
            const metadataScript = document.createElement('script');
            metadataScript.type = 'application/json';
            metadataScript.id = 'ai-page-metadata';
            metadataScript.textContent = JSON.stringify(metadata);
            
            // Check if it already exists
            const existingMetadata = document.getElementById('ai-page-metadata');
            if (existingMetadata) {
              existingMetadata.textContent = JSON.stringify(metadata);
            } else {
              document.head.appendChild(metadataScript);
            }
            
            // Make the page self-documenting for AI agents
            document.documentElement.setAttribute('data-ai-optimized', 'true');
            
            // Make helper globally accessible
            window.AIHelper = {
              findElement(targetOrDescription) {
                // Find by exact target
                let element = document.querySelector(\`[data-ai-target="\${targetOrDescription}"]\`);
                
                // If not found, try matching description
                if (!element) {
                  element = document.querySelector(\`[data-ai-description*="\${targetOrDescription}"]\`);
                }
                
                return element;
              },
              
              getInteractiveElements() {
                return Array.from(document.querySelectorAll('[data-ai-action]')).map(el => ({
                  target: el.getAttribute('data-ai-target'),
                  action: el.getAttribute('data-ai-action'),
                  description: el.getAttribute('data-ai-description'),
                  text: el.textContent?.trim(),
                  tagName: el.tagName.toLowerCase(),
                  visible: window.__AI_AGENT_HELPERS__?.describeElement(el).visible || false,
                  interactable: !el.disabled
                }));
              }
            };
            
            console.log('[AI Optimizer] Helper initialized (default enabled)');
          })();
        `
      }}
    />
  );
}

// Custom hook to access AI agent context
export function useAIAgent() {
  return useContext(AIAgentContext);
}

// Utility function to generate a target ID for an element
function generateTargetId(element) {
  // Try to create a meaningful ID based on content and attributes
  const text = element.textContent?.trim();
  const id = element.id;
  const ariaLabel = element.getAttribute('aria-label');
  const placeholder = element.getAttribute('placeholder');
  const name = element.getAttribute('name');
  
  // Use the most descriptive attribute available
  let baseId = '';
  if (id) baseId = id;
  else if (ariaLabel) baseId = ariaLabel.replace(/\s+/g, '-').toLowerCase();
  else if (name) baseId = name;
  else if (placeholder) baseId = placeholder.replace(/\s+/g, '-').toLowerCase();
  else if (text && text.length < 20) baseId = text.replace(/\s+/g, '-').toLowerCase();
  else baseId = `${element.tagName.toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`;
  
  // Clean up the ID to be valid
  baseId = baseId.replace(/[^a-z0-9-_]/gi, '-');
  
  return `ai-target-${baseId}`;
}

// Check if an element is visible
function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  
  // Check CSS properties that can hide elements
  if (
    style.display === 'none' || 
    style.visibility === 'hidden' || 
    style.opacity === '0' ||
    rect.width === 0 || 
    rect.height === 0
  ) {
    return false;
  }
  
  // Basic check if element is in viewport
  if (
    rect.bottom < 0 || 
    rect.top > window.innerHeight || 
    rect.right < 0 || 
    rect.left > window.innerWidth
  ) {
    return false;
  }
  
  return true;
}

// Check if an element is interactable
function isElementInteractable(element) {
  if (!element) return false;
  if (!isElementVisible(element)) return false;
  
  const style = window.getComputedStyle(element);
  
  // Check properties that make elements non-interactable
  return (
    !element.disabled && 
    style.pointerEvents !== 'none' &&
    element.getAttribute('aria-disabled') !== 'true'
  );
}

// Export a component that adds AI assistance to existing pages
export function AIAgentAssistant() {
  const { isAIAgent, captureElements } = useAIAgent();
  
  if (!isAIAgent) return null;
  
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        padding: '8px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}
    >
      <div>AI Agent Assistance Active (Default Enabled)</div>
      <button 
        onClick={() => {
          captureElements();
        }}
        style={{
          background: '#4CAF50',
          border: 'none',
          borderRadius: '2px',
          padding: '4px 8px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '10px'
        }}
      >
        Scan Elements
      </button>
    </div>
  );
}

export default AIAgentProvider;