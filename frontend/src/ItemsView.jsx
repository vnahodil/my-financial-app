
import React, { useState, useEffect } from 'react';
import axios from 'axios';

import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Alert from 'react-bootstrap/Alert'; // For errors
import Spinner from 'react-bootstrap/Spinner'; // For loading

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

function ItemsView() { // Changed component name
    // --- State, Effects, and Functions specific to Items ---
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
        const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch items.';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
  
     const handleAddItem = async (e) => {
       e.preventDefault();
       if (!newItemName.trim()) return;
       setError(null);
       const currentInput = newItemName; // Store before clearing
       setNewItemName('');
  
       try {
         await axios.post(`${API_URL}/api/items`, { name: currentInput });
         fetchItems(); // Refetch
       } catch (err) {
          console.error("Error adding item:", err);
          const errorMsg = err.response?.data?.error || err.message || 'Failed to add item.';
          setError(errorMsg);
          setNewItemName(currentInput); // Restore input on error
       }
     };
  
    useEffect(() => {
      fetchItems();
    }, []);
  
    // --- JSX for the Items View ---
    return (
      <> {/* Use Fragment or a simple div wrapper */}
        <h2>Leave a message:</h2> {/* Add a heading for this specific view */}
        <hr />
  
        <Form onSubmit={handleAddItem} className="mb-4 d-flex">
          <Form.Control
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="New item name"
            required
            className="me-2"
          />
          <Button variant="primary" type="submit" disabled={loading}>
            Add Item
          </Button>
        </Form>
  
        {loading && (
          <div className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}
  
        {error && <Alert variant="danger">{error}</Alert>}
  
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
      </>
    );
  }
  
  export default ItemsView;