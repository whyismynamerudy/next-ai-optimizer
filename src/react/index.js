// Export React components and hooks
export { 
    AIAgentProvider, 
    AIAgentAssistant,
    useAIAgent
  } from './AIAgentProvider';
  
  export { 
    useAIAgentInteraction, 
    AIAgentDebugger 
  } from './useAIAgentInteraction';
  
  export { withAIEnhancement } from './withAIEnhancement';
  
  export { useComponentMap } from './useComponentMap';
  
  // Export a convenience method to trigger component map updates
  export function updateComponentMap() {
    if (typeof window !== 'undefined' && window.__AI_AGENT_HELPERS__) {
      return window.__AI_AGENT_HELPERS__.updateComponentMap();
    }
    return Promise.resolve(false);
  }