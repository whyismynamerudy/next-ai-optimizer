// Export the main API
const { withAIOptimizer } = require('./next/config');
const babelPlugin = require('./babel/plugin');

// Main exports
module.exports = {
  withAIOptimizer,
  babelPlugin
};

// Export React components under specific path
// Users will import from 'next-ai-optimizer/react'