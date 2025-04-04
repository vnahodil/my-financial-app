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
      <Card className="mb-4 shadow-sm" style={{ backgroundColor: 'rgba(51, 51, 51, 0.8)', backdropFilter: 'blur(10px)' }}>
        <Card.Header as="h5" style={{ backgroundColor: 'rgba(58, 58, 58, 0.9)' }}>My Cookbook</Card.Header>
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
                table: ({ node, ...props }) => (
                  <Table 
                    responsive 
                    size="sm" 
                    className="text-white mb-4" 
                    style={{ 
                      background: 'transparent',
                      borderSpacing: '0 8px',
                      borderCollapse: 'separate',
                      '--bs-table-bg': 'transparent',
                      '--bs-table-color': 'white',
                    }} 
                    {...props} 
                  />
                ),
                td: ({node, ...props}) => (
                  <td style={{background: 'transparent', color: 'white', padding: '0px'}} {...props} />
                ),
                th: ({node, ...props}) => (
                  <th style={{background: 'transparent', color: 'white', padding: '0px'}} {...props} />
                )
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
