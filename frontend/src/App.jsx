// src/App.jsx
import React, { useState } from 'react';

// Import React-Bootstrap layout components
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

// Import your custom components
// Removed Sidebar import
import ItemsView from './ItemsView';
import ProfileView from './ProfileView';
import CookbookView from './CookbookView';

// Define VIEWS constant locally since Sidebar is removed
const VIEWS = {
  ITEMS: 'items',
  PROFILE: 'profile',
  COOKBOOK: 'cookbook',
};

function App() {
  // State to track the currently active view
  const [activeView, setActiveView] = useState(VIEWS.ITEMS); // Default to Items view

  // Function to render the correct component based on the active view
  const renderActiveView = () => {
    switch (activeView) {
      case VIEWS.ITEMS: // Changed case
        return <ItemsView />; // Changed component
      case VIEWS.PROFILE:
        return <ProfileView />;
      case VIEWS.COOKBOOK: // Add case for CookbookView
        return <CookbookView />;
      default:
        return <ItemsView />; // Fallback to items view
    }
  };

  return (
    <div className="app-container"> {/* Add a wrapper div */}
      <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="top-navbar">
        <Container fluid> {/* Use fluid container for full width navbar */}
          <Navbar.Brand href="#home" onClick={() => setActiveView(VIEWS.ITEMS)}>
            {/* Placeholder for Logo */}
            <img
              src="https://via.placeholder.com/100x30?text=Logo" // Placeholder image URL
              width="100"
              height="30"
              className="d-inline-block align-top"
              alt="App logo placeholder"
            />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto"> {/* Align links to the right */}
              <Nav.Link
                href="#items"
                active={activeView === VIEWS.ITEMS}
                onClick={() => setActiveView(VIEWS.ITEMS)}
              >
                Items
              </Nav.Link>
              <Nav.Link
                href="#profile"
                active={activeView === VIEWS.PROFILE}
                onClick={() => setActiveView(VIEWS.PROFILE)}
              >
                Profile
              </Nav.Link>
              <Nav.Link
                href="#cookbook"
                active={activeView === VIEWS.COOKBOOK}
                onClick={() => setActiveView(VIEWS.COOKBOOK)}
              >
                Cookbook
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Main Content Area */}
      <div className="content-area"> {/* Apply content-area class */}
        {/* Render the component returned by renderActiveView */}
        {renderActiveView()}
      </div>
    </div>
  );
}

export default App;
