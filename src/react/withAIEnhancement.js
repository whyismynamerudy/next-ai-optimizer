// src/react/withAIEnhancement.js
import React, { useRef, useEffect } from 'react';

/**
 * Higher-order component that enhances React components for AI agent interaction
 * 
 * @param {React.ComponentType} Component - The component to enhance
 * @param {Object} options - Enhancement options
 * @param {string} [options.name] - Custom name for the component
 * @param {string} [options.description] - Description of the component's purpose
 * @param {Array<Object>} [options.interactionPoints] - Specific interaction points in the component
 * @returns {React.ForwardRefExoticComponent} Enhanced component with AI metadata
 */
export function withAIEnhancement(Component, options = {}) {
  // Create a forwarding component that adds AI metadata
  const EnhancedComponent = React.forwardRef((props, ref) => {
    // Create a local ref if none is provided
    const internalRef = useRef(null);
    const combinedRef = useCombinedRefs(ref, internalRef);
    
    // Generate component name for reference
    const componentName = options.name || Component.displayName || Component.name || 'UnknownComponent';
    
    // Add AI metadata to the component after it's mounted
    useEffect(() => {
      if (internalRef.current) {
        // Add basic attributes
        internalRef.current.setAttribute('data-ai-component', componentName);
        internalRef.current.setAttribute('data-ai-target', `component-${componentName}`);
        
        // Add description if provided
        if (options.description) {
          internalRef.current.setAttribute('data-ai-description', options.description);
        }
        
        // Register interaction points if specified
        if (options.interactionPoints && Array.isArray(options.interactionPoints)) {
          // Store interaction metadata in a dataset attribute
          internalRef.current.setAttribute(
            'data-ai-interaction-points', 
            JSON.stringify(options.interactionPoints)
          );
          
          // Try to find and mark each interaction point
          options.interactionPoints.forEach(point => {
            if (point.element) {
              try {
                const elements = internalRef.current.querySelectorAll(point.element);
                elements.forEach(element => {
                  // Add interaction metadata
                  if (point.type) {
                    element.setAttribute('data-ai-action', point.type);
                  }
                  
                  if (point.description) {
                    element.setAttribute('data-ai-description', point.description);
                  }
                  
                  // For input elements
                  if (point.type === 'input' && point.inputType) {
                    element.setAttribute('data-ai-input-type', point.inputType);
                  }
                  
                  // For elements that complete a flow
                  if (point.completes) {
                    element.setAttribute('data-ai-completes', 'true');
                  }
                  
                  // Generate a target ID if not present
                  if (!element.hasAttribute('data-ai-target')) {
                    const targetId = `${componentName}-${point.type || 'element'}-${generateShortHash()}`;
                    element.setAttribute('data-ai-target', targetId);
                  }
                });
              } catch (error) {
                console.warn(`[AI Optimizer] Failed to find interaction element "${point.element}" in ${componentName}`, error);
              }
            }
          });
        }
      }
    }, []);
    
    // Add AI-related props to the component
    const aiProps = {
      'data-ai-component': componentName,
      'data-ai-enhanced': 'true',
      ref: combinedRef
    };
    
    // If the component is a DOM element (string), spread the props
    if (typeof Component === 'string') {
      return <Component {...props} {...aiProps} />;
    }
    
    // Otherwise pass them as a single prop to avoid warnings about unknown props
    return <Component {...props} aiMetadata={aiProps} ref={combinedRef} />;
  });
  
  // Set display name for debugging
  EnhancedComponent.displayName = `AIEnhanced(${Component.displayName || Component.name || 'Component'})`;
  
  // Copy static methods from the wrapped component
  if (Component.propTypes) {
    EnhancedComponent.propTypes = Component.propTypes;
  }
  
  if (Component.defaultProps) {
    EnhancedComponent.defaultProps = Component.defaultProps;
  }
  
  // Copy any other static properties
  hoistNonReactStatics(EnhancedComponent, Component);
  
  return EnhancedComponent;
}

/**
 * Utility function to combine multiple refs
 * @param {...React.Ref} refs - Refs to combine
 * @returns {React.RefObject} Combined ref
 */
function useCombinedRefs(...refs) {
  const targetRef = React.useRef(null);
  
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

/**
 * Generate a short hash for unique IDs
 * @returns {string} Random short hash
 */
function generateShortHash() {
  return Math.random().toString(36).substring(2, 8);
}

/**
 * Simplified version of hoist-non-react-statics
 * @param {React.ComponentType} targetComponent - Component to copy statics to
 * @param {React.ComponentType} sourceComponent - Component to copy statics from
 */
function hoistNonReactStatics(targetComponent, sourceComponent) {
  // React-specific statics that shouldn't be copied
  const REACT_STATICS = {
    childContextTypes: true,
    contextType: true,
    contextTypes: true,
    defaultProps: true,
    displayName: true,
    getDefaultProps: true,
    getDerivedStateFromError: true,
    getDerivedStateFromProps: true,
    mixins: true,
    propTypes: true,
    type: true
  };
  
  const sourceStatics = Object.getOwnPropertyNames(sourceComponent)
    .concat(Object.getOwnPropertySymbols(sourceComponent).map(sym => sym.toString()));
  
  sourceStatics.forEach(key => {
    if (!REACT_STATICS[key] && key !== 'prototype' && key !== 'arguments' && key !== 'caller') {
      try {
        targetComponent[key] = sourceComponent[key];
      } catch (e) {
        // Some properties cannot be copied
      }
    }
  });
  
  return targetComponent;
}

export default withAIEnhancement;