// src/next/config.js
const path = require('path');
const fs = require('fs');

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
function enhanceWithAIOptimization(config, { isServer, dev }) {
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
    
    // Add plugin to generate component map for AI agents
    if (isServer) {
      config.plugins.push(new AIComponentMapPlugin({
        outputPath: './public/ai-component-map.json'
      }));
    }
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
          openaiApiKey: process.env.OPENAI_API_KEY,
          generateComponentMap: true,
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
        openaiApiKey: process.env.OPENAI_API_KEY,
        generateComponentMap: true,
        optimizationLevel: process.env.AI_OPTIMIZATION_LEVEL || 'standard'
      }
    ]);
  }
}

/**
 * Plugin to generate component map during build
 */
class AIComponentMapPlugin {
  constructor(options = {}) {
    this.options = options;
    this.outputPath = path.resolve(options.outputPath || './public/ai-component-map.json');
  }
  
  apply(compiler) {
    const pluginName = 'AIComponentMapPlugin';
    
    // Register component info during compilation
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      // This helps detect components in the current build
      compilation.hooks.finishModules.tap(pluginName, (modules) => {
        modules.forEach(module => {
          if (module.buildInfo && module.buildInfo.aiComponents) {
            if (!global.__NEXT_AI_COMPONENT_REGISTRY__) {
              global.__NEXT_AI_COMPONENT_REGISTRY__ = [];
            }
            
            module.buildInfo.aiComponents.forEach(component => {
              global.__NEXT_AI_COMPONENT_REGISTRY__.push({
                name: component.name,
                file: module.resource || 'unknown',
                description: component.description || '',
                props: component.props || []
              });
            });
          }
        });
      });
    });
    
    // Generate the component map file
    compiler.hooks.done.tap(pluginName, (stats) => {
      const componentRegistry = global.__NEXT_AI_COMPONENT_REGISTRY__ || [];
      
      // Check for existing component map and merge with new data
      let existingMap = {};
      try {
        if (fs.existsSync(this.outputPath)) {
          const existingData = fs.readFileSync(this.outputPath, 'utf8');
          existingMap = JSON.parse(existingData);
        }
      } catch (err) {
        console.warn('[AI Optimizer] Could not read existing component map:', err.message);
      }
      
      // Create updated component map
      const componentMap = {
        components: [
          ...(existingMap.components || []),
          ...componentRegistry
        ].filter((component, index, self) => 
          // Remove duplicates by name
          index === self.findIndex(c => c.name === component.name)
        ),
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      };
      
      // Add elements found during runtime if they exist in window
      if (global.__AI_AGENT_RUNTIME_ELEMENTS__) {
        componentMap.runtimeElements = global.__AI_AGENT_RUNTIME_ELEMENTS__;
      }
      
      // Write the component map to the output path
      const outputDir = path.dirname(this.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(this.outputPath, JSON.stringify(componentMap, null, 2));
      console.log(`[AI Optimizer] Generated component map at ${this.outputPath} with ${componentMap.components.length} components`);
    });
  }
}

module.exports = {
  withAIOptimizer,
  AIComponentMapPlugin
};