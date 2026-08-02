/**
 * ErrorBoundary — catches render errors below it and shows a full-screen
 * ErrorState instead of a blank crash. "Try again" resets the boundary so
 * React re-renders the subtree from scratch.
 */
import React from 'react';
import { View } from 'react-native';
import { colors, spacing } from '../theme';
import { captureException } from '../lib/sentry';
import { ErrorState } from './ErrorState';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureException(error, { componentStack: info.componentStack });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.appBg,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.screen,
          }}
        >
          <ErrorState
            title="Something broke"
            body="An unexpected error happened. You can try again."
            actionLabel="Try again"
            onAction={this.reset}
          />
        </View>
      );
    }
    return this.props.children;
  }
}
