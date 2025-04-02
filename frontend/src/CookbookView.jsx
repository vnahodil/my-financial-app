import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Table from 'react-bootstrap/Table'; // Import Table component

// Import the raw markdown content
// Vite handles importing .md files as raw strings by default
import cookbookMarkdown from './assets/Cookbook.md?raw';

function CookbookView() {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate fetching or processing if needed,
    // but here we directly use the imported markdown string.
    try {
      if (cookbookMarkdown) {
        setMarkdown(cookbookMarkdown);
      } else {
        throw new Error("Cookbook content could not be loaded.");
      }
    } catch (err) {
      console.error("Error loading cookbook markdown:", err);
      setError("Failed to load the cookbook content.");
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <Container fluid className="py-4 px-md-5">
      <Card className="shadow-sm">
        <Card.Header as="h2">My Cookbook</Card.Header>
        <Card.Body>
          {loading && (
            <div className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          )}
          {error && <Alert variant="danger">{error}</Alert>}
          {!loading && !error && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Map the 'table' markdown element to a React Bootstrap Table
                table: ({ node, ...props }) => <Table striped bordered hover responsive size="sm" {...props} />
              }}
            >
              {markdown}
            </ReactMarkdown>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default CookbookView;
