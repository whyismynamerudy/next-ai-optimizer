// src/react/index.d.ts
import React from 'react';

export interface AIAgentProviderProps {
  children: React.ReactNode;
  disableOptimization?: boolean;
}

export function AIAgentProvider(props: AIAgentProviderProps): JSX.Element;

export function useAIAgentInteraction(): {
  interactiveElements: any[];
  error: string | null;
  findElementByTarget: (targetValue: string) => HTMLElement | null;
  findElementsByComponent: (componentName: string) => HTMLElement[];
  findElementsByAction: (actionType: string) => HTMLElement[];
  findElementsByDescription: (descriptionText: string) => HTMLElement[];
  clickElement: (targetOrElement: string | HTMLElement) => boolean;
  fillInput: (targetOrElement: string | HTMLElement, value: string) => boolean;
  selectOption: (targetOrElement: string | HTMLElement, value: string) => boolean;
  fillForm: (formSelector: string, data: Record<string, any>) => boolean;
  submitForm: (formSelector: string) => boolean;
  scanInteractiveElements: () => void;
};

export interface AIAgentDebuggerProps {}

export function AIAgentDebugger(props: AIAgentDebuggerProps): JSX.Element;

export function withAIEnhancement<P>(
  Component: React.ComponentType<P>,
  options?: {
    name?: string;
    description?: string;
    interactionPoints?: Array<{
      element: string;
      type?: string;
      description?: string;
      inputType?: string;
      completes?: boolean;
    }>;
  }
): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<unknown>>;