// components/ErrorBoundary.js
import React from "react";
import { useNavigate } from "react-router-dom";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center text-red-600">
          <h2 className="text-xl font-bold">Something went wrong.</h2>
          <p>
            Please refresh the page or contact{' '}
            <button
              type="button"
              onClick={() => {
                if (this.props.navigate) this.props.navigate('/support');
              }}
              className="text-blue-600 dark:text-blue-400 underline font-medium"
            >
              support
            </button>
            
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

function ErrorBoundaryWithNavigate(props) {
  const navigate = useNavigate();
  return <ErrorBoundary {...props} navigate={navigate} />;
}

export default ErrorBoundaryWithNavigate;
