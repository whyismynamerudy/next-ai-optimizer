// AIAgentProvider.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';

// Create a context for AI agent information
const AIAgentContext = createContext({
  isAIAgent: false,
  componentMap: null,
  registerComponent: () => {},
  findTargetElement: () => null
});

/**
 * Provider component that sets up AI agent detection and helpers
 */
export function AIAgentProvider({ children }) {
  const [isAIAgent, setIsAIAgent] = useState(false);
  const [componentMap, setComponentMap] = useState(null);
  const [registeredComponents, setRegisteredComponents] = useState({});
  
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
      const isAIParam = urlParams.get('ai-agent') === 'true';
      
      setIsAIAgent(isLikelyAI || isAIParam);
      
      // If this appears to be an AI agent, load the component map
      if (isLikelyAI || isAIParam) {
        loadComponentMap();
      }
    };
    
    const loadComponentMap = async () => {
      try {
        const response = await fetch('/ai-component-map.json');
        if (response.ok) {
          const map = await response.json();
          setComponentMap(map);
        }
      } catch (error) {
        console.warn('Failed to load AI component map:', error);
      }
    };
    
    detectAIAgent();
  }, []);
  
  // Function to register a component instance
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
  
  // Add global helper for AI agents if in browser
  useEffect(() => {
    if (typeof window !== 'undefined' && isAIAgent) {
      window.__AI_AGENT_HELPERS__ = {
        findElement: findTargetElement,
        getComponentMap: () => componentMap,
        getRegisteredComponents: () => registeredComponents,
        getInteractiveElements: () => 
          Array.from(document.querySelectorAll('[data-ai-action]')),
        describeElement: (element) => {
          if (!element) return null;
          return {
            aiTarget: element.getAttribute('data-ai-target'),
            aiAction: element.getAttribute('data-ai-action'),
            aiComponent: element.closest('[data-ai-component]')?.getAttribute('data-ai-component'),
            tagName: element.tagName.toLowerCase(),
            text: element.textContent?.trim(),
            id: element.id,
            classNames: element.className,
            type: element.getAttribute('type') || undefined,
            ariaLabel: element.getAttribute('aria-label') || undefined,
            visible: isElementVisible(element),
            interactable: isElementInteractable(element)
          };
        }
      };
    }
    
    // Add a way for AI agents to signal they're ready
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'AI_AGENT_READY') {
          setIsAIAgent(true);
        }
      });
    }
  }, [isAIAgent, componentMap, registeredComponents]);
  
  // Inject AI agent assistance if needed
  useEffect(() => {
    if (isAIAgent) {
      // Add assistive markers to help AI agents identify elements
      const enhancePageForAI = () => {
        // Add special styling to make targets more visible
        const style = document.createElement('style');
        style.textContent = `
          [data-ai-target]:focus {
            outline: 2px solid #4CAF50 !important;
          }
          
          [data-ai-action] {
            cursor: pointer;
          }
        `;
        document.head.appendChild(style);
        
        // Enhance interactive elements with visual indicators for AI
        document.querySelectorAll('button, a, input, select, [role="button"]').forEach(element => {
          if (!element.hasAttribute('data-ai-target')) {
            const aiTarget = generateTargetId(element);
            element.setAttribute('data-ai-target', aiTarget);
            
            // Add action type
            if (element.tagName === 'BUTTON' || element.tagName === 'A' || element.getAttribute('role') === 'button') {
              element.setAttribute('data-ai-action', 'click');
            } else if (element.tagName === 'INPUT') {
              element.setAttribute('data-ai-action', 'input');
              element.setAttribute('data-ai-input-type', element.type || 'text');
            } else if (element.tagName === 'SELECT') {
              element.setAttribute('data-ai-action', 'select');
            }
          }
        });
      };
      
      enhancePageForAI();
      
      // Re-scan for new elements periodically for single-page apps
      const observer = new MutationObserver((mutations) => {
        let needsUpdate = false;
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length > 0) {
            needsUpdate = true;
          }
        });
        
        if (needsUpdate) {
          enhancePageForAI();
        }
      });
      
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
      
      return () => observer.disconnect();
    }
  }, [isAIAgent]);
  
  return (
    <AIAgentContext.Provider 
      value={{
        isAIAgent,
        componentMap,
        registerComponent,
        findTargetElement
      }}
    >
      {children}
    </AIAgentContext.Provider>
  );
}

// Custom hook to access AI agent context
export function useAIAgent() {
  return useContext(AIAgentContext);
}

// Higher-order component to make components AI-friendly
export function withAIEnhancement(Component, options = {}) {
  const EnhancedComponent = React.forwardRef((props, ref) => {
    const { isAIAgent, registerComponent } = useAIAgent();
    const componentRef = React.useRef(null);
    const combinedRef = useCombinedRefs(ref, componentRef);
    
    // Generate a component name for reference
    const componentName = options.name || Component.displayName || Component.name || 'UnknownComponent';
    
    // Register this component instance
    React.useEffect(() => {
      if (componentRef.current) {
        registerComponent(componentName, componentRef);
      }
    }, [componentName, registerComponent]);
    
    return (
      <Component
        {...props}
        ref={combinedRef}
        data-ai-component={componentName}
        data-ai-enhanced="true"
      />
    );
  });
  
  EnhancedComponent.displayName = `AIEnhanced(${Component.displayName || Component.name || 'Component'})`;
  
  return EnhancedComponent;
}

// Utility function to combine refs
function useCombinedRefs(...refs) {
  const targetRef = React.useRef();
  
  React.useEffect(() => {
    refs.forEach(ref => {
      if (!ref) return;
      
      if (typeof ref === 'function') {
        ref(targetRef.current);
      } else {
        ref.current = targetRef.current;
      }
    });
  }, [refs]);
  
  return targetRef;
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
  
  return `ai-target-${baseId}`;
}

// Check if an element is visible
function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  
  return style.display !== 'none' 
    && style.visibility !== 'hidden' 
    && style.opacity !== '0'
    && rect.width > 0 
    && rect.height > 0
    && element.offsetParent !== null;
}

// Check if an element is interactable
function isElementInteractable(element) {
  if (!element) return false;
  if (!isElementVisible(element)) return false;
  
  const style = window.getComputedStyle(element);
  return style.pointerEvents !== 'none' && !element.disabled;
}

// Export a component that adds AI assistance to existing pages
export function AIAgentAssistant() {
  const { isAIAgent } = useAIAgent();
  
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
        pointerEvents: 'none'
      }}
    >
      AI Agent Assistance Active
    </div>
  );
}