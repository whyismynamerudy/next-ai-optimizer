'use client';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

// Create a context for AI agent information
const AIAgentContext = createContext({
  isAIAgent: false,
  componentMap: null,
  registerComponent: () => {},
  findTargetElement: () => null,
  elementRegistry: {}
});

/**
 * Provider component that sets up AI agent detection and helpers
 */
export function AIAgentProvider({ children, forceOptimization = false }) {
  const [isAIAgent, setIsAIAgent] = useState(true);
  const [componentMap, setComponentMap] = useState(null);
  const [registeredComponents, setRegisteredComponents] = useState({});
  const [elementRegistry, setElementRegistry] = useState({});
  const isCapturing = useRef(false);
  const previousUrl = useRef('');
  
  // Detect if the current user is likely an AI agent
  useEffect(() => {
    const detectAIAgent = () => {
      // Simple detection based on common AI agent identifiers
      const userAgent = navigator.userAgent.toLowerCase();
      const aiSignifiers = [
        'bot', 'crawler', 'spider', 'headless', 'selenium', 'puppeteer',
        'playwright', 'cypress', 'automation', 'lighthouse', 'axe'
      ];
      
      const isLikelyAI = aiSignifiers.some(term => userAgent.includes(term));
      
      // Also check for AI-specific URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const isAIParam = urlParams.get('ai-agent') === 'true' || isAIAgent;
      
      setIsAIAgent(isLikelyAI || isAIParam || forceOptimization);
      
      // If this appears to be an AI agent, load the component map
      if (isLikelyAI || isAIParam || forceOptimization) {
        loadComponentMap();
      }
    };
    
    const loadComponentMap = async () => {
      try {
        const response = await fetch('/ai-component-map.json');
        if (response.ok) {
          const map = await response.json();
          setComponentMap(map);
        } else {
          // If no map exists yet, create an initial one
          const initialMap = {
            components: [],
            runtimeElements: [],
            generatedAt: new Date().toISOString(),
            version: '1.0.0'
          };
          setComponentMap(initialMap);
          
          // Try to save the initial map
          await updateComponentMapOnServer(initialMap);
        }
      } catch (error) {
        console.warn('Failed to load AI component map, creating new one');
        // Create an initial component map
        const initialMap = {
          components: [],
          runtimeElements: [],
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        };
        setComponentMap(initialMap);
      }
    };
    
    detectAIAgent();
  }, [forceOptimization]);

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
    const capturedElements = [];
    
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
      
      // Calculate absolute position within the document
      const absolutePosition = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
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
        absolutePosition,
        attributes,
        timestamp: Date.now()
      };
      
      newRegistry[aiTarget] = elementInfo;
      capturedElements.push(elementInfo);
    });
    
    // Update the registry
    setElementRegistry(newRegistry);
    isCapturing.current = false;
    
    return capturedElements;
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
  
  // Update the component map on the server
  const updateComponentMapOnServer = async (data = null) => {
    try {
      const elements = data?.runtimeElements || captureInteractiveElements();
      
      const updatedMap = {
        ...componentMap,
        runtimeElements: elements,
        generatedAt: new Date().toISOString()
      };
      
      // Use the new App Router API route
      const response = await fetch('/api/ai-component-map/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedMap)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update component map: ${response.status}`);
      }
      
      // Update the local component map state
      setComponentMap(updatedMap);
      return true;
    } catch (error) {
      console.error('Error updating component map:', error);
      return false;
    }
  };
  
  // Register a component instance
  const registerComponent = (componentName, elementRef) => {
    if (!elementRef.current) return;
    
    setRegisteredComponents(prev => ({
      ...prev,
      [componentName]: elementRef
    }));
    
    // Add AI attributes to the component element
    if (elementRef.current) {
      elementRef.current.setAttribute('data-ai-component', componentName);
      elementRef.current.setAttribute('data-ai-target', `component-${componentName}`);
    }
  };
  
  // Function to find an element by its AI target
  const findTargetElement = (targetValue) => {
    return document.querySelector(`[data-ai-target="${targetValue}"]`);
  };

  // Listen for navigation changes (including client-side navigation)
  useEffect(() => {
    if (!isAIAgent) return;
    
    // Initial capture
    const initialCapture = setTimeout(() => {
      captureInteractiveElements();
      updateComponentMapOnServer();
    }, 1000); // Delay to ensure page is fully rendered
    
    // Function to handle URL changes (for SPA navigation)
    const handleUrlChange = () => {
      const currentUrl = window.location.href;
      if (previousUrl.current !== currentUrl) {
        previousUrl.current = currentUrl;
        
        // Wait for the new page to render
        setTimeout(() => {
          captureInteractiveElements();
          updateComponentMapOnServer();
        }, 1000);
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
                node.querySelector(interactiveSelectors.join(','))
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
        if (window.aiMapUpdateTimeout) {
          clearTimeout(window.aiMapUpdateTimeout);
        }
        
        window.aiMapUpdateTimeout = setTimeout(() => {
          captureInteractiveElements();
          updateComponentMapOnServer();
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
      updateComponentMapOnServer();
    }, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(refreshInterval);
      clearTimeout(initialCapture);
      if (window.aiMapUpdateTimeout) {
        clearTimeout(window.aiMapUpdateTimeout);
      }
      
      observer.disconnect();
      window.removeEventListener('popstate', handleUrlChange);
      
      // Restore original history methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [isAIAgent, componentMap]);
  
  // Add global helper for AI agents if in browser
  useEffect(() => {
    if (typeof window !== 'undefined' && isAIAgent) {
      window.__AI_AGENT_HELPERS__ = {
        findElement: findTargetElement,
        getComponentMap: () => componentMap,
        getRegisteredComponents: () => registeredComponents,
        getInteractiveElements: () => elementRegistry,
        captureElements: captureInteractiveElements,
        updateComponentMap: updateComponentMapOnServer,
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
        }
      };
    }
    
    // Add a way for AI agents to signal they're ready
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'AI_AGENT_READY') {
          setIsAIAgent(true);
          
          // Capture elements after the agent signals it's ready
          setTimeout(() => {
            captureInteractiveElements();
            updateComponentMapOnServer();
          }, 500);
        }
      });
    }
  }, [isAIAgent, componentMap, registeredComponents, elementRegistry]);
  
  return (
    <AIAgentContext.Provider 
      value={{
        isAIAgent,
        componentMap,
        elementRegistry,
        registerComponent,
        findTargetElement,
        captureElements: captureInteractiveElements,
        updateComponentMap: updateComponentMapOnServer
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
            
            // Add global event to manually trigger a component map update
            window.updateAIComponentMap = function() {
              if (window.__AI_AGENT_HELPERS__) {
                return window.__AI_AGENT_HELPERS__.updateComponentMap();
              }
              return false;
            };
            
            // Automatically update when the page becomes fully interactive
            if (document.readyState === 'complete') {
              setTimeout(function() {
                window.updateAIComponentMap && window.updateAIComponentMap();
              }, 1000);
            } else {
              window.addEventListener('load', function() {
                setTimeout(function() {
                  window.updateAIComponentMap && window.updateAIComponentMap();
                }, 1000);
              });
            }
            
            console.log('[AI Optimizer] Helper initialized');
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
  
  // Check if element is outside the viewport (not visible without scrolling)
  if (
    rect.bottom < 0 || 
    rect.top > window.innerHeight || 
    rect.right < 0 || 
    rect.left > window.innerWidth
  ) {
    return false;
  }
  
  // Check if the element is covered by another element
  const center = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
  
  const elementAtPoint = document.elementFromPoint(center.x, center.y);
  
  if (!elementAtPoint) return false;
  
  // Check if this element or one of its children is at this point
  return element === elementAtPoint || element.contains(elementAtPoint);
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
  const { isAIAgent, captureElements, updateComponentMap } = useAIAgent();
  
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
      <div>AI Agent Assistance Active</div>
      <button 
        onClick={() => {
          captureElements();
          updateComponentMap();
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
        Update Component Map
      </button>
    </div>
  );
}

export default AIAgentProvider;