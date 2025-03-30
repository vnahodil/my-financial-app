// src/App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Import React-Bootstrap components
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Alert from 'react-bootstrap/Alert'; // For errors
import Spinner from 'react-bootstrap/Spinner'; // For loading

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

function App() {
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/items`); // Ensure /api/ path
      setItems(response.data);
    } catch (err) {
      console.error("Error fetching items:", err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch items. Is the backend running correctly and CORS configured?';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

   const handleAddItem = async (e) => {
     e.preventDefault(); // Prevent default form submission
     if (!newItemName.trim()) return;

     // Optimistic UI update (optional): Add item locally first
     // const tempId = Date.now(); // Temporary ID
     // const optimisticItem = { id: tempId, name: newItemName };
     // setItems([...items, optimisticItem]);

     setError(null); // Clear previous errors
     setNewItemName(''); // Clear input immediately

     try {
       const response = await axios.post(`${API_URL}/api/items`, { // Ensure /api/ path
         name: newItemName,
       });
       // If optimistic update was used, replace temp item, otherwise just fetch
       // setItems(currentItems => currentItems.map(item => item.id === tempId ? response.data : item));
       fetchItems(); // Refetch the list to ensure consistency (simpler)
     } catch (err) {
        console.error("Error adding item:", err);
        const errorMsg = err.response?.data?.error || err.message || 'Failed to add item.';
        setError(errorMsg);
        // If optimistic update was used, remove the temp item on error
        // setItems(currentItems => currentItems.filter(item => item.id !== tempId));
        // Keep input value in case user wants to retry
        // setNewItemName(newItemName); // Uncomment this line if you want to keep the value
     }
   };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    // Use Container for padding and centering (optional max-width)
    <Container className="py-4">
      <h1 className="text-center mb-4">My Items</h1>

      {/* Use Form component */}
      <Form onSubmit={handleAddItem} className="mb-4 d-flex">
        <Form.Control
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="New item name"
          required // Add basic HTML5 validation
          className="me-2" // Add margin to the right
        />
        <Button variant="primary" type="submit">
          Add Item
        </Button>
      </Form>

      {/* Display loading spinner */}
      {loading && (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      {/* Display error Alert */}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Display item list using ListGroup */}
      {!loading && !error && (
        <ListGroup>
          {items.length > 0 ? (
            items.map(item => (
              <ListGroup.Item key={item.id}>
                {item.name}
                {item.description && <small className="d-block text-muted">{item.description}</small>}
              </ListGroup.Item>
            ))
          ) : (
            <ListGroup.Item className="text-center text-muted">No items found.</ListGroup.Item>
          )}
        </ListGroup>
      )}
    </Container>
  );
}

export default App;