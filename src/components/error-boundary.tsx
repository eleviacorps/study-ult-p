"use client";

import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "#0F1117", color: "#F8FAFC", fontFamily: "sans-serif", padding: "2rem", textAlign: "center",
        }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
            <p style={{ fontSize: "0.875rem", opacity: 0.5, maxWidth: "400px", wordBreak: "break-word" }}>
              {this.state.error.message}
            </p>
            <button onClick={() => window.location.reload()} style={{
              marginTop: "1.5rem", padding: "0.5rem 1.5rem", borderRadius: "0.5rem",
              background: "#1856FF", color: "white", border: "none", cursor: "pointer", fontSize: "0.875rem",
            }}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
