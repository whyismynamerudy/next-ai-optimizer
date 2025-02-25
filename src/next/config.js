// src/next/config.js
const path = require('path');

/**
 * Helper function to create a Next.js config with AI optimization
 * @param {Object} nextConfig - The existing Next.js configuration
 * @returns {Object} Enhanced Next.js configuration
 */
function withAIOptimizer(nextConfig = {}) {
  return {
    ...nextConfig,
    // Preserve existing webpack config if present
    webpack: (config, options) => {
      const updatedConfig = nextConfig.webpack ? 
        nextConfig.webpack(config, options) : 
        config;
      
      // Add our AI optimization
      return enhanceWithAIOptimization(updatedConfig, options);
    }
  };
}

/**
 * Function to enhance webpack config with AI optimization
 * @param {Object} config - Webpack configuration
 * @param {Object} options - Next.js webpack options
 * @returns {Object} Enhanced webpack configuration
 */
function enhanceWithAIOptimization(config, { dev }) {
  // Only apply in production builds or when specifically requested
  const shouldOptimize = !dev || process.env.OPTIMIZE_FOR_AI === 'true';
  
  if (shouldOptimize) {
    // Find the babel loader rule
    const jsRule = findBabelRule(config);
    
    if (jsRule) {
      addBabelPlugin(jsRule);
    } else {
      console.warn('[AI Optimizer] Could not find suitable babel rule in webpack config');
    }
    
    // Add HTML metadata through webpack plugins
    config.plugins.push(new EnhanceHTMLPlugin());
  }
  
  return config;
}

/**
 * Find the babel loader rule in the webpack config
 * @param {Object} config - Webpack configuration
 * @returns {Object|null} The babel rule if found
 */
function findBabelRule(config) {
  // Different versions of Next.js have different webpack configurations
  // Try to find the rule that handles JSX/TSX files
  
  const jsxRule = config.module.rules.find(
    rule => rule.test && (
      rule.test.toString().includes('jsx') || 
      rule.test.toString().includes('tsx')
    )
  );
  
  if (jsxRule) {
    return jsxRule;
  }
  
  // Look deeper in oneOf rules (Next.js 12+ structure)
  for (const rule of config.module.rules) {
    if (rule.oneOf) {
      const jsxOneOfRule = rule.oneOf.find(
        r => r.test && (
          r.test.toString().includes('jsx') || 
          r.test.toString().includes('tsx')
        )
      );
      
      if (jsxOneOfRule) {
        return jsxOneOfRule;
      }
    }
  }
  
  return null;
}

/**
 * Add our babel plugin to the rule
 * @param {Object} rule - Webpack rule
 */
function addBabelPlugin(rule) {
  // The structure can vary based on Next.js version
  // Try to handle the most common cases
  
  if (rule.use && Array.isArray(rule.use)) {
    // Find babel-loader
    const babelLoader = rule.use.find(
      loader => (
        (typeof loader === 'object' && loader.loader && 
          (loader.loader.includes('babel-loader') || loader.loader.includes('next-babel-loader'))) ||
        (typeof loader === 'string' && 
          (loader.includes('babel-loader') || loader.includes('next-babel-loader')))
      )
    );
    
    if (babelLoader && typeof babelLoader === 'object') {
      if (!babelLoader.options) {
        babelLoader.options = {};
      }
      
      if (!babelLoader.options.plugins) {
        babelLoader.options.plugins = [];
      }
      
      babelLoader.options.plugins.push([
        require.resolve('../babel/plugin'),
        {
          optimizationLevel: process.env.AI_OPTIMIZATION_LEVEL || 'standard'
        }
      ]);
    }
  } else if (rule.use && rule.use.loader && 
            (rule.use.loader.includes('babel-loader') || rule.use.loader.includes('next-babel-loader'))) {
    // Direct loader object
    if (!rule.use.options) {
      rule.use.options = {};
    }
    
    if (!rule.use.options.plugins) {
      rule.use.options.plugins = [];
    }
    
    rule.use.options.plugins.push([
      require.resolve('../babel/plugin'),
      {
        optimizationLevel: process.env.AI_OPTIMIZATION_LEVEL || 'standard'
      }
    ]);
  }
}

/**
 * Webpack plugin to enhance HTML with AI metadata
 */
class EnhanceHTMLPlugin {
  apply(compiler) {
    // This plugin will add the data-ai-optimized attribute to the HTML document
    if (compiler.hooks && compiler.hooks.compilation) {
      compiler.hooks.compilation.tap('EnhanceHTMLPlugin', (compilation) => {
        // Check if HtmlWebpackPlugin is being used
        if (compilation.hooks.htmlWebpackPluginAfterHtmlProcessing) {
          compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.tapAsync(
            'EnhanceHTMLPlugin',
            (data, callback) => {
              // Add data-ai-optimized attribute to html tag
              data.html = data.html.replace(
                '<html',
                '<html data-ai-optimized="true"'
              );
              
              // Add AI helper script before closing body tag
              const helperScript = `
                <script>
                  (function() {
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
                          visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
                          interactable: !el.disabled
                        }));
                      }
                    };
                  })();
                </script>
              `;
              
              data.html = data.html.replace(
                '</body>',
                `${helperScript}</body>`
              );
              
              callback(null, data);
            }
          );
        }
      });
    }
  }
}

module.exports = {
  withAIOptimizer
};