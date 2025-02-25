/**
 * Utility functions for analyzing DOM elements
 * These are used by the runtime component mapping system
 */

/**
 * Check if an element is visible in the viewport
 * @param {HTMLElement} element - The DOM element to check
 * @returns {boolean} Whether the element is visible
 */
export function isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    // Check CSS properties that can hide elements
    if (
      style.display === 'none' || 
      style.visibility === 'hidden' || 
      style.opacity === '0' ||
      parseFloat(style.opacity) === 0 ||
      rect.width === 0 || 
      rect.height === 0
    ) {
      return false;
    }
    
    // Check if element has zero dimensions or is outside viewport
    const isInViewport = (
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth &&
      rect.bottom > 0 &&
      rect.right > 0
    );
    
    if (!isInViewport) {
      return false;
    }
    
    // Check if the element is covered by another element (more expensive operation)
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    const elementAtPoint = document.elementFromPoint(center.x, center.y);
    
    if (!elementAtPoint) return false;
    
    // Check if this element or one of its children is at this point
    return element === elementAtPoint || element.contains(elementAtPoint) || elementAtPoint.contains(element);
  }
  
  /**
   * Check if an element is interactable (not disabled)
   * @param {HTMLElement} element - The DOM element to check
   * @returns {boolean} Whether the element is interactable
   */
  export function isElementInteractable(element) {
    if (!element) return false;
    if (!isElementVisible(element)) return false;
    
    const style = window.getComputedStyle(element);
    
    // Check properties that make elements non-interactable
    if (
      element.disabled === true || 
      style.pointerEvents === 'none' ||
      element.getAttribute('aria-disabled') === 'true' ||
      element.getAttribute('disabled') !== null
    ) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Generate a unique target ID for an element based on its properties
   * @param {HTMLElement} element - The DOM element
   * @returns {string} A unique target ID
   */
  export function generateTargetId(element) {
    // Try to create a meaningful ID based on content and attributes
    const text = element.textContent?.trim();
    const id = element.id;
    const ariaLabel = element.getAttribute('aria-label');
    const placeholder = element.getAttribute('placeholder');
    const name = element.getAttribute('name');
    const dataTestId = element.getAttribute('data-testid');
    
    // Use the most descriptive attribute available
    let baseId = '';
    if (id) baseId = id;
    else if (dataTestId) baseId = dataTestId;
    else if (ariaLabel) baseId = ariaLabel.replace(/\s+/g, '-').toLowerCase();
    else if (name) baseId = name;
    else if (placeholder) baseId = placeholder.replace(/\s+/g, '-').toLowerCase();
    else if (text && text.length < 20) baseId = text.replace(/\s+/g, '-').toLowerCase();
    else baseId = `${element.tagName.toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Clean up the ID to be valid
    baseId = baseId.replace(/[^a-z0-9-_]/gi, '-')
      .replace(/--+/g, '-')  // Remove duplicate hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    return `ai-target-${baseId}`;
  }
  
  /**
   * Determine the most appropriate interaction type for an element
   * @param {HTMLElement} element - The DOM element
   * @returns {string} The interaction type (click, input, select, etc.)
   */
  export function determineInteractionType(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type')?.toLowerCase();
    
    switch (tagName) {
      case 'button':
      case 'a':
      case 'summary':
      case 'details':
        return 'click';
        
      case 'input':
        if (type === 'checkbox' || type === 'radio') {
          return 'click';
        } else if (type === 'submit' || type === 'button' || type === 'reset' || type === 'image') {
          return 'click';
        } else if (type === 'file') {
          return 'upload';
        } else if (type === 'range') {
          return 'range';
        } else if (type === 'color') {
          return 'color';
        } else if (type === 'date' || type === 'datetime-local' || type === 'month' || type === 'time' || type === 'week') {
          return 'date';
        } else {
          return 'input';
        }
        
      case 'select':
        return 'select';
        
      case 'textarea':
        return 'input';
      
      case 'option':
        return 'select';
        
      case 'label':
        return 'click';
        
      default:
        // Check roles
        const role = element.getAttribute('role')?.toLowerCase();
        if (role === 'button' || role === 'link') {
          return 'click';
        } else if (role === 'checkbox' || role === 'radio' || role === 'switch') {
          return 'click';
        } else if (role === 'textbox' || role === 'searchbox') {
          return 'input';
        } else if (role === 'listbox' || role === 'combobox') {
          return 'select';
        } else if (role === 'slider') {
          return 'range';
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
  
  /**
   * Compute a CSS selector path for an element
   * @param {HTMLElement} element - The DOM element
   * @returns {string} A CSS selector path
   */
  export function computeElementPath(element) {
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
      if (currentNode.className && typeof currentNode.className === 'string') {
        const classNames = currentNode.className.split(/\s+/).filter(Boolean);
        if (classNames.length > 0) {
          selector += `.${classNames.join('.')}`;
        }
      }
      
      // Add role if present
      const role = currentNode.getAttribute('role');
      if (role) {
        selector += `[role="${role}"]`;
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
  
  /**
   * Get all important attributes of an element
   * @param {HTMLElement} element - The DOM element
   * @returns {Object} Object with all relevant attributes
   */
  export function getElementAttributes(element) {
    const attributes = {};
    
    // List of attributes we're particularly interested in
    const importantAttributes = [
      'id', 'class', 'name', 'type', 'role', 'aria-label', 'aria-labelledby',
      'aria-describedby', 'title', 'placeholder', 'href', 'src', 'alt',
      'value', 'checked', 'disabled', 'readonly', 'required', 'data-testid'
    ];
    
    // First get all attributes
    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
    
    // Then add computed properties
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
      attributes.value = element.value;
      
      if (element.type === 'checkbox' || element.type === 'radio') {
        attributes.checked = element.checked;
      }
    }
    
    return attributes;
  }
  
  /**
   * Calculate element position info
   * @param {HTMLElement} element - The DOM element
   * @returns {Object} Position data including viewport and absolute positions
   */
  export function getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    
    return {
      viewport: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      },
      absolute: {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom + window.scrollY,
        right: rect.right + window.scrollX
      },
      // Calculate center point
      center: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      },
      // Calculate visibility percentage in viewport
      visiblePercentage: calculateVisiblePercentage(rect)
    };
  }
  
  /**
   * Calculate what percentage of an element is visible in the viewport
   * @param {DOMRect} rect - The element's bounding rectangle
   * @returns {number} Percentage visible (0-100)
   */
  function calculateVisiblePercentage(rect) {
    // Element dimensions
    const elementWidth = rect.width;
    const elementHeight = rect.height;
    const elementArea = elementWidth * elementHeight;
    
    if (elementArea === 0) return 0;
    
    // Viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate the intersection of the element with the viewport
    const left = Math.max(0, rect.left);
    const top = Math.max(0, rect.top);
    const right = Math.min(viewportWidth, rect.right);
    const bottom = Math.min(viewportHeight, rect.bottom);
    
    // Calculate visible area
    const visibleWidth = Math.max(0, right - left);
    const visibleHeight = Math.max(0, bottom - top);
    const visibleArea = visibleWidth * visibleHeight;
    
    // Calculate percentage
    return (visibleArea / elementArea) * 100;
  }