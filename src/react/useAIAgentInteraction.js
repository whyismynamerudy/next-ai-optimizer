// useAIAgentInteraction.js
import { useState, useEffect } from 'react';
import React from 'react';

/**
 * Hook for AI agents to interact with enhanced components
 * Provides structured access to component information and interactions
 */
export function useAIAgentInteraction() {
  const [interactiveElements, setInteractiveElements] = useState([]);
  const [error, setError] = useState(null);
  
  // Load interactive elements on initialization
  useEffect(() => {
    // Scan the page for all interactive elements
    scanInteractiveElements();
    
    // When we're in a SPA (Single Page Application), we'll want to rescan
    // after navigation or major DOM changes
    const observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any significant elements were added
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // If this is a component or contains interactive elements, rescan
              if (
                node.hasAttribute('data-ai-component') ||
                node.querySelector('[data-ai-action]')
              ) {
                shouldRescan = true;
                break;
              }
            }
          }
        }
        if (shouldRescan) break;
      }
      
      if (shouldRescan) {
        scanInteractiveElements();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Scan the page for interactive elements
  const scanInteractiveElements = () => {
    try {
      const elements = document.querySelectorAll('[data-ai-action]');
      const elementInfos = Array.from(elements).map(element => ({
        element,
        aiTarget: element.getAttribute('data-ai-target'),
        aiAction: element.getAttribute('data-ai-action'),
        aiDescription: element.getAttribute('data-ai-description'),
        component: element.closest('[data-ai-component]')?.getAttribute('data-ai-component'),
        tagName: element.tagName.toLowerCase(),
        text: element.textContent?.trim(),
        inputType: element.getAttribute('data-ai-input-type'),
        isVisible: isElementVisible(element),
        isInteractable: !element.disabled && getComputedStyle(element).pointerEvents !== 'none'
      }));
      
      setInteractiveElements(elementInfos);
    } catch (err) {
      setError(err.message);
      console.error('Error scanning interactive elements:', err);
    }
  };
  
  // Find an element by its AI target
  const findElementByTarget = (targetValue) => {
    return document.querySelector(`[data-ai-target="${targetValue}"]`);
  };
  
  // Find elements by component name
  const findElementsByComponent = (componentName) => {
    const componentElement = document.querySelector(`[data-ai-component="${componentName}"]`);
    if (!componentElement) return [];
    
    return Array.from(componentElement.querySelectorAll('[data-ai-action]'));
  };
  
  // Find all elements of a specific interaction type
  const findElementsByAction = (actionType) => {
    return Array.from(document.querySelectorAll(`[data-ai-action="${actionType}"]`));
  };
  
  // Find elements by description text
  const findElementsByDescription = (descriptionText) => {
    return Array.from(document.querySelectorAll(`[data-ai-description*="${descriptionText}"]`));
  };
  
  // Perform a click interaction
  const clickElement = (targetOrElement) => {
    const element = typeof targetOrElement === 'string' 
      ? findElementByTarget(targetOrElement)
      : targetOrElement;
      
    if (!element) {
      console.error(`Element not found: ${targetOrElement}`);
      return false;
    }
    
    if (!isElementVisible(element) || !isElementInteractable(element)) {
      console.error(`Element is not interactable: ${targetOrElement}`);
      return false;
    }
    
    element.click();
    return true;
  };
  
  // Fill an input field
  const fillInput = (targetOrElement, value) => {
    const element = typeof targetOrElement === 'string' 
      ? findElementByTarget(targetOrElement)
      : targetOrElement;
      
    if (!element) {
      console.error(`Element not found: ${targetOrElement}`);
      return false;
    }
    
    if (!isElementVisible(element) || !isElementInteractable(element)) {
      console.error(`Element is not interactable: ${targetOrElement}`);
      return false;
    }
    
    // Set value and dispatch events to trigger React state updates
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  
  // Select an option from a dropdown
  const selectOption = (targetOrElement, value) => {
    const element = typeof targetOrElement === 'string' 
      ? findElementByTarget(targetOrElement)
      : targetOrElement;
      
    if (!element || element.tagName !== 'SELECT') {
      console.error(`Select element not found: ${targetOrElement}`);
      return false;
    }
    
    if (!isElementVisible(element) || !isElementInteractable(element)) {
      console.error(`Element is not interactable: ${targetOrElement}`);
      return false;
    }
    
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  
  // Fill a complete form with data
  const fillForm = (formSelector, data) => {
    const form = document.querySelector(formSelector);
    if (!form) {
      console.error(`Form not found: ${formSelector}`);
      return false;
    }
    
    let success = true;
    
    // Process each field in the data object
    Object.entries(data).forEach(([name, value]) => {
      const field = form.querySelector(`[name="${name}"]`);
      if (!field) {
        console.error(`Field not found: ${name}`);
        success = false;
        return;
      }
      
      if (field.tagName === 'SELECT') {
        success = selectOption(field, value) && success;
      } else if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
        success = fillInput(field, value) && success;
      }
    });
    
    return success;
  };

  // Submit a form
  const submitForm = (formSelector) => {
    const form = document.querySelector(formSelector);
    if (!form) {
      console.error(`Form not found: ${formSelector}`);
      return false;
    }
    
    // Look for a submit button
    const submitButton = form.querySelector('[type="submit"], button:not([type]), [data-ai-action="click"][data-ai-target*="submit"]');
    if (submitButton) {
      submitButton.click();
      return true;
    }
    
    // If no button found, try to submit the form directly
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return true;
  };

  return {
    // State
    interactiveElements,
    error,
    
    // Element finders
    findElementByTarget,
    findElementsByComponent,
    findElementsByAction,
    findElementsByDescription,
    
    // Interactions
    clickElement,
    fillInput,
    selectOption,
    fillForm,
    submitForm,
    
    // Utils
    scanInteractiveElements
  };
}

// Helper function to check if an element is visible
function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  
  return style.display !== 'none' 
    && style.visibility !== 'hidden' 
    && style.opacity !== '0'
    && rect.width > 0 
    && rect.height > 0;
}

// Helper function to check if an element is interactable
function isElementInteractable(element) {
  if (!element) return false;
  if (!isElementVisible(element)) return false;
  
  return !element.disabled && window.getComputedStyle(element).pointerEvents !== 'none';
}

// Export a React component that can be used to debug AI agent interaction
export function AIAgentDebugger() {
  const {
    interactiveElements,
    error
  } = useAIAgentInteraction();
  
  if (error) {
    return (
      <div style={{ 
        position: 'fixed', 
        bottom: '10px', 
        right: '10px',
        background: '#f44336',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        maxWidth: '300px',
        zIndex: 9999
      }}>
        <h3>AI Agent Error</h3>
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px',
      borderRadius: '4px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      maxWidth: '300px',
      maxHeight: '300px',
      overflow: 'auto',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      <h3 style={{ margin: '0 0 8px 0' }}>AI Agent Debugger</h3>
      <div>
        <strong>Interactive Elements: {interactiveElements.length}</strong>
        <ul style={{ margin: '4px 0', padding: '0 0 0 16px' }}>
          {interactiveElements.slice(0, 5).map((info, index) => (
            <li key={index}>
              {info.aiTarget} ({info.aiAction})
            </li>
          ))}
          {interactiveElements.length > 5 && <li>...and {interactiveElements.length - 5} more</li>}
        </ul>
      </div>
    </div>
  );
}