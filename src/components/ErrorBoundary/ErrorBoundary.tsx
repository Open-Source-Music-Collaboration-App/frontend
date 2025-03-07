/**
 * @file ErrorBoundary.tsx
 * @description Error Boundary component that catches JavaScript errors in its child component tree.
 * Error boundaries are React components that catch JavaScript errors anywhere in their child
 * component tree, log those errors, and display a fallback UI instead of crashing the component tree.
 * 
 * @see https://reactjs.org/docs/error-boundaries.html
 * 
 */

import React, { Component, ReactNode } from "react";

/**
 * @interface ErrorBoundaryProps
 * @description Interface for the props of the ErrorBoundary component.
 * 
 * @property {ReactNode} children - Child components to be rendered and monitored for errors.
 */
interface ErrorBoundaryProps {
  children: ReactNode;
}

/**
 * @interface ErrorBoundaryState
 * @description Interface for the state of the ErrorBoundary component.
 * 
 * @property {boolean} hasError - Flag indicating whether an error has been caught.
 */
interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * @class ErrorBoundary
 * @extends {Component<ErrorBoundaryProps, ErrorBoundaryState>}
 * @description A class component that implements error boundary functionality to catch errors
 * in its child component tree and display a fallback UI.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /**
   * @constructor
   * @description Initialize the component state.
   * 
   * @param {ErrorBoundaryProps} props - Component props.
   */
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * @static
   * @method getDerivedStateFromError
   * @description React lifecycle method called when an error is thrown in a descendant component.
   * This method is used to update the state so the next render will show the fallback UI.
   * 
   * @param {Error} error - The error that was thrown.
   * @returns {ErrorBoundaryState} Updated state object indicating an error occurred.
   */
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  /**
   * @method componentDidCatch
   * @description React lifecycle method called after an error has been thrown by a descendant component.
   * This method is used for logging error information.
   * 
   * @param {Error} error - The error that was thrown.
   * @param {React.ErrorInfo} errorInfo - Information about which component threw the error.
   * @returns {void}
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  /**
   * @method render
   * @description Renders either the fallback UI when an error is caught or the children components.
   * 
   * @returns {ReactNode} The fallback UI or children components.
   */
  render() {
    if (this.state.hasError) {
        return <h1>Error</h1>
    }

    return this.props.children;
  }
}

export default ErrorBoundary;