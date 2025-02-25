import { 
    isElementVisible, 
    isElementInteractable, 
    generateTargetId, 
    determineInteractionType,
    computeElementPath,
    getElementAttributes,
    getElementPosition
  } from './elementUtils';
  
  /**
   * Manager class for handling component map operations
   */
  export class ComponentMapManager {
    constructor() {
      this.isCapturing = false;
      this.elementRegistry = {};
      this.currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      this.interactiveSelectors = [
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
        '[role="switch"]',
        '[role="combobox"]',
        '[role="searchbox"]',
        '[data-ai-action]'
      ];
    }
  
    /**
     * Capture all interactive elements on the page
     * @returns {Array} Array of captured element information objects
     */
    captureInteractiveElements() {
      if (typeof window === 'undefined') return [];
      if (this.isCapturing) return Object.values(this.elementRegistry);
      
      this.isCapturing = true;
      const elements = document.querySelectorAll(this.interactiveSelectors.join(','));
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
        
        // Get element position
        const position = getElementPosition(element);
        
        // Get element attributes
        const attributes = getElementAttributes(element);
        
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
          value: attributes.value,
          href: element.getAttribute('href') || undefined,
          path,
          content: element.textContent?.trim().substring(0, 100) || '',
          position,
          attributes,
          visible: true,
          interactable: true,
          timestamp: Date.now()
        };
        
        this.elementRegistry[aiTarget] = elementInfo;
        capturedElements.push(elementInfo);
      });
      
      this.isCapturing = false;
      return capturedElements;
    }
    
    /**
     * Fetch the current component map from the server
     * @returns {Promise<Object>} The component map
     */
    async fetchComponentMap() {
      try {
        const response = await fetch('/api/ai-component-map/update', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch component map: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching component map:', error);
        
        // Return a basic empty structure if fetching fails
        return {
          components: [],
          runtimeElements: [],
          generatedAt: new Date().toISOString(),
          version: '1.0.0',
          pageContexts: {}
        };
      }
    }
    
    /**
     * Update the component map on the server
     * @returns {Promise<boolean>} Whether the update was successful
     */
    async updateComponentMap() {
      try {
        // Capture the latest elements
        const elements = this.captureInteractiveElements();
        
        // Get current component map as base
        let componentMap;
        try {
          componentMap = await this.fetchComponentMap();
        } catch (error) {
          // Create new map if fetching fails
          componentMap = {
            components: [],
            runtimeElements: [],
            generatedAt: new Date().toISOString(),
            version: '1.0.0',
            pageContexts: {}
          };
        }
        
        // Update with new elements
        const updatedMap = {
          ...componentMap,
          runtimeElements: elements,
          currentPath: typeof window !== 'undefined' ? window.location.pathname : '/',
          generatedAt: new Date().toISOString()
        };
        
        // Send update to server
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
        
        return true;
      } catch (error) {
        console.error('Error updating component map:', error);
        return false;
      }
    }
    
    /**
     * Find an element on the page by its target ID
     * @param {string} targetId - The target ID to search for
     * @returns {HTMLElement|null} The matching element or null
     */
    findElementByTarget(targetId) {
      if (typeof document === 'undefined') return null;
      return document.querySelector(`[data-ai-target="${targetId}"]`);
    }
    
    /**
     * Get all registered elements
     * @returns {Object} The element registry
     */
    getElementRegistry() {
      return this.elementRegistry;
    }
    
    /**
     * Reset the element registry
     */
    resetElementRegistry() {
      this.elementRegistry = {};
    }
    
    /**
     * Check if the URL has changed
     * @returns {boolean} Whether the URL has changed since last check
     */
    hasUrlChanged() {
      if (typeof window === 'undefined') return false;
      
      const currentUrl = window.location.href;
      const hasChanged = this.currentUrl !== currentUrl;
      
      if (hasChanged) {
        this.currentUrl = currentUrl;
      }
      
      return hasChanged;
    }
    
    /**
     * Setup navigation monitoring to update the component map on page changes
     */
    setupNavigationMonitoring() {
      if (typeof window === 'undefined') return;
      
      // Initial capture
      setTimeout(() => {
        this.captureInteractiveElements();
        this.updateComponentMap();
      }, 1000);
      
      // Handle URL changes (for SPA navigation)
      const handleUrlChange = () => {
        if (this.hasUrlChanged()) {
          // Wait for the new page to render
          setTimeout(() => {
            this.resetElementRegistry();
            this.captureInteractiveElements();
            this.updateComponentMap();
          }, 1000);
        }
      };
      
      // Set up listeners for different navigation methods
      window.addEventListener('popstate', handleUrlChange);
      
      // Intercept history methods
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;
      
      window.history.pushState = function(...args) {
        originalPushState.apply(this, args);
        handleUrlChange();
      };
      
      window.history.replaceState = function(...args) {
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
                  node.matches(this.interactiveSelectors.join(',')) || 
                  node.querySelector && node.querySelector(this.interactiveSelectors.join(','))
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
              targetElement.matches(this.interactiveSelectors.join(','))
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
            this.captureInteractiveElements();
            this.updateComponentMap();
          }, 500);
        }
      });
      
      // Start observing the document
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'hidden', 'style', 'class']
      });
      
      return () => {
        window.removeEventListener('popstate', handleUrlChange);
        window.history.pushState = originalPushState;
        window.history.replaceState = originalReplaceState;
        observer.disconnect();
        if (window.aiMapUpdateTimeout) {
          clearTimeout(window.aiMapUpdateTimeout);
        }
      };
    }
  }
  
  // Export a singleton instance
  export const componentMapManager = typeof window !== 'undefined' ? new ComponentMapManager() : null;
  
  // Export a function to get the instance safely
  export function getComponentMapManager() {
    if (typeof window === 'undefined') return null;
    return componentMapManager || new ComponentMapManager();
  }