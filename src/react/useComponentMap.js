'use client';
import { useState, useEffect, useCallback } from 'react';
import { getComponentMapManager } from '../utils/componentMapManager';

/**
 * React hook for using the component map functionality
 * Provides access to element registry and component map operations
 * 
 * @returns {Object} Component map utilities and state
 */
export function useComponentMap() {
  const [elementRegistry, setElementRegistry] = useState({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Initialize the component map manager
  useEffect(() => {
    const manager = getComponentMapManager();
    if (!manager) return;
    
    // Set up navigation monitoring for automatic updates
    const cleanup = manager.setupNavigationMonitoring();
    
    // Initial capture
    captureElements();
    
    return cleanup;
  }, []);
  
  // Capture interactive elements
  const captureElements = useCallback(() => {
    const manager = getComponentMapManager();
    if (!manager) return [];
    
    setIsCapturing(true);
    try {
      const elements = manager.captureInteractiveElements();
      setElementRegistry(manager.getElementRegistry());
      setIsCapturing(false);
      setLastUpdated(new Date());
      return elements;
    } catch (error) {
      console.error('Error capturing elements:', error);
      setIsCapturing(false);
      return [];
    }
  }, []);
  
  // Update the component map on the server
  const updateComponentMap = useCallback(async () => {
    const manager = getComponentMapManager();
    if (!manager) return false;
    
    try {
      const success = await manager.updateComponentMap();
      if (success) {
        setLastUpdated(new Date());
      }
      return success;
    } catch (error) {
      console.error('Error updating component map:', error);
      return false;
    }
  }, []);
  
  // Find an element by its target ID
  const findElementByTarget = useCallback((targetId) => {
    const manager = getComponentMapManager();
    if (!manager) return null;
    
    return manager.findElementByTarget(targetId);
  }, []);
  
  // Get registry by component name
  const getElementsByComponent = useCallback((componentName) => {
    return Object.values(elementRegistry).filter(
      element => element.aiComponent === componentName
    );
  }, [elementRegistry]);
  
  // Get registry by action type
  const getElementsByAction = useCallback((actionType) => {
    return Object.values(elementRegistry).filter(
      element => element.aiAction === actionType
    );
  }, [elementRegistry]);
  
  // Force a re-capture and update
  const refreshComponentMap = useCallback(async () => {
    captureElements();
    return await updateComponentMap();
  }, [captureElements, updateComponentMap]);
  
  return {
    elementRegistry,
    isCapturing,
    lastUpdated,
    captureElements,
    updateComponentMap,
    findElementByTarget,
    getElementsByComponent,
    getElementsByAction,
    refreshComponentMap
  };
}