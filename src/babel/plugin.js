// babel-plugin-nextjs-ai-optimizer.js
const { declare } = require('@babel/helper-plugin-utils');
const { types: t } = require('@babel/core');

/**
 * Babel plugin to enhance React components for better AI agent interaction
 */
module.exports = declare((api, options = {}) => {
  api.assertVersion(7);

  return {
    name: 'nextjs-ai-optimizer',
    
    visitor: {
      /**
       * Process JSX elements to add AI-friendly attributes
       */
      JSXElement(path, state) {
        const element = path.node;
        const openingElement = element.openingElement;
        
        // Skip if this is a fragment or has been processed
        if (
          openingElement.name.type === 'JSXIdentifier' && 
          openingElement.name.name === 'Fragment'
        ) {
          return;
        }
        
        // Don't process if element already has ai-target attribute
        if (openingElement.attributes.some(attr => 
          attr.type === 'JSXAttribute' && 
          attr.name.name === 'data-ai-target'
        )) {
          return;
        }

        // Add basic semantic information based on element type
        enrichElementWithAttributes(path, state);
      },
      
      /**
       * Process React component declarations
       */
      FunctionDeclaration(path, state) {
        if (isReactComponent(path)) {
          processComponent(path, state);
        }
      },
      
      ArrowFunctionExpression(path, state) {
        if (isReactComponent(path)) {
          processComponent(path, state);
        }
      },
    }
  };
});

/**
 * Check if a function is likely a React component
 */
function isReactComponent(path) {
  // Function name starts with uppercase letter (convention for React components)
  const name = path.node.id?.name;
  if (name && /^[A-Z]/.test(name)) {
    return true;
  }
  
  // Function returns JSX
  let returnsJSX = false;
  path.traverse({
    ReturnStatement(returnPath) {
      const arg = returnPath.node.argument;
      if (arg && (t.isJSXElement(arg) || t.isJSXFragment(arg))) {
        returnsJSX = true;
      }
    }
  });
  
  return returnsJSX;
}

/**
 * Process a React component
 */
function processComponent(path, state) {
  const componentName = path.node.id?.name;
  if (!componentName) return;
  
  // Extract component description and props information
  const componentInfo = {
    name: componentName,
    props: extractPropTypes(path),
    description: extractComponentDescription(path),
    filename: state.filename
  };
  
  // Store component info in state for later use
  if (!state.file.metadata.aiComponents) {
    state.file.metadata.aiComponents = [];
  }
  
  state.file.metadata.aiComponents.push(componentInfo);
}

/**
 * Extract prop types from component
 */
function extractPropTypes(path) {
  const props = [];
  
  // Look for prop parameter in function component
  if (path.node.params && path.node.params.length > 0) {
    const propsParam = path.node.params[0];
    
    if (t.isObjectPattern(propsParam)) {
      // Destructured props
      propsParam.properties.forEach(prop => {
        if (t.isObjectProperty(prop) || t.isRestElement(prop)) {
          const name = prop.key?.name || 'rest';
          props.push({ name });
        }
      });
    } else if (t.isIdentifier(propsParam)) {
      // Props as a single object
      path.traverse({
        MemberExpression(memberPath) {
          if (
            t.isIdentifier(memberPath.node.object) &&
            memberPath.node.object.name === propsParam.name &&
            t.isIdentifier(memberPath.node.property)
          ) {
            const propName = memberPath.node.property.name;
            if (!props.some(p => p.name === propName)) {
              props.push({ name: propName });
            }
          }
        }
      });
    }
  }
  
  return props;
}

/**
 * Extract component description from comments
 */
function extractComponentDescription(path) {
  const comments = path.node.leadingComments || [];
  return comments
    .map(comment => comment.value.trim())
    .join('\n');
}

/**
 * Enrich JSX elements with AI-friendly attributes
 */
function enrichElementWithAttributes(path, state) {
  const element = path.node;
  const openingElement = element.openingElement;
  const elementName = openingElement.name.name;
  const attributes = openingElement.attributes;
  
  // Get existing IDs or keys
  const id = attributes.find(attr => 
    attr.type === 'JSXAttribute' && 
    attr.name.name === 'id'
  )?.value?.value;
  
  const key = attributes.find(attr => 
    attr.type === 'JSXAttribute' && 
    attr.name.name === 'key'
  )?.value?.value;
  
  // Generate a suitable AI target identifier
  let aiTarget;
  
  if (id) {
    aiTarget = id;
  } else if (key && typeof key === 'string') {
    aiTarget = key;
  } else {
    // Generate based on element type and context
    const parentComponent = state.file.metadata?.aiComponents?.[0]?.name || 'unknown';
    aiTarget = `${parentComponent}-${elementName}-${generateShortHash()}`;
  }
  
  // Add data-ai-target attribute
  openingElement.attributes.push(
    t.jsxAttribute(
      t.jsxIdentifier('data-ai-target'),
      t.stringLiteral(aiTarget)
    )
  );
  
  // Add semantic attributes based on element type
  if (isInteractiveElement(elementName)) {
    addInteractionAttributes(openingElement, elementName);
  }
}

/**
 * Check if element is interactive
 */
function isInteractiveElement(elementName) {
  return [
    'button', 'a', 'input', 'select', 'textarea', 'form',
    'details', 'dialog', 'menu', 'menuitem', 'option'
  ].includes(elementName.toLowerCase());
}

/**
 * Add interaction-specific attributes
 */
function addInteractionAttributes(openingElement, elementName) {
  switch (elementName.toLowerCase()) {
    case 'button':
    case 'a':
      if (!hasAttribute(openingElement, 'data-ai-action')) {
        openingElement.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-ai-action'),
            t.stringLiteral('click')
          )
        );
      }
      break;
      
    case 'input':
      const typeAttr = getAttribute(openingElement, 'type');
      const inputType = typeAttr?.value?.value || 'text';
      
      if (!hasAttribute(openingElement, 'data-ai-input-type')) {
        openingElement.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-ai-input-type'),
            t.stringLiteral(inputType)
          )
        );
      }
      
      // Determine correct action type based on input type
      let actionType = 'input';
      if (inputType === 'button' || inputType === 'submit' || inputType === 'reset' || 
          inputType === 'checkbox' || inputType === 'radio') {
        actionType = 'click';
      }
      
      if (!hasAttribute(openingElement, 'data-ai-action')) {
        openingElement.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-ai-action'),
            t.stringLiteral(actionType)
          )
        );
      }
      break;
      
    case 'form':
      if (!hasAttribute(openingElement, 'data-ai-interaction')) {
        openingElement.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-ai-interaction'),
            t.stringLiteral('form-submission')
          )
        );
      }
      break;
      
    case 'select':
      if (!hasAttribute(openingElement, 'data-ai-action')) {
        openingElement.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-ai-action'),
            t.stringLiteral('select')
          )
        );
      }
      break;
      
    case 'textarea':
      if (!hasAttribute(openingElement, 'data-ai-action')) {
        openingElement.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-ai-action'),
            t.stringLiteral('input')
          )
        );
      }
      break;
  }
}

/**
 * Check if element has a specific attribute
 */
function hasAttribute(openingElement, name) {
  return openingElement.attributes.some(attr => 
    attr.type === 'JSXAttribute' && 
    attr.name.name === name
  );
}

/**
 * Get specific attribute from element
 */
function getAttribute(openingElement, name) {
  return openingElement.attributes.find(attr => 
    attr.type === 'JSXAttribute' && 
    attr.name.name === name
  );
}

/**
 * Generate a short hash for unique IDs
 */
function generateShortHash() {
  return Math.random().toString(36).substring(2, 8);
}