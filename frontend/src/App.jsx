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
import LandingPageView from './LandingPageView';

// Define VIEWS constant locally since Sidebar is removed
const VIEWS = {
  ITEMS: 'items',
  PROFILE: 'profile',
  COOKBOOK: 'cookbook',
  LANDING: 'landing',
};

function App() {
  // State to track the currently active view
  const [activeView, setActiveView] = useState(VIEWS.LANDING); // Default to Items view

  // Function to handle navigation between views
  const handleNavigation = (target) => {
    if (target === '#profile') {
      setActiveView(VIEWS.PROFILE);
    }
  };

  // Function to render the correct component based on the active view
  const renderActiveView = () => {
    switch (activeView) {
      case VIEWS.ITEMS: // Changed case
        return <ItemsView />; // Changed component
      case VIEWS.LANDING: // Changed case
        return <LandingPageView onNavigate={handleNavigation} />; // Pass navigation handler
      case VIEWS.PROFILE:
        return <ProfileView />;
      case VIEWS.COOKBOOK: // Add case for CookbookView
        return <CookbookView />;
      default:
        return <LandingPageView />; // Fallback to landing page view
    }
  };

  return (
    <div className="app-container"> {/* Add a wrapper div */}
      <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="top-navbar">
        <Container fluid> {/* Use fluid container for full width navbar */}
          <Navbar.Brand href="#home" onClick={() => setActiveView(VIEWS.LANDING)}>
            {/* Placeholder for Logo */}
            <img
              src="/logo.svg" // Placeholder image URL
              width="60"
              height="60"
              className="d-inline-block align-top"
              alt="Zmuda s.r.o."
            />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto"> {/* Align links to the right */}
            <Nav.Link
                href="#home"
                active={activeView === VIEWS.LANDING}
                onClick={() => setActiveView(VIEWS.LANDING)}
              >
                HOME
              </Nav.Link>
            <Nav.Link
                href="#items"
                active={activeView === VIEWS.ITEMS}
                onClick={() => setActiveView(VIEWS.ITEMS)}
              >
                CHAT
              </Nav.Link>
              <Nav.Link
                href="#profile"
                active={activeView === VIEWS.PROFILE}
                onClick={() => setActiveView(VIEWS.PROFILE)}
              >
                CV
              </Nav.Link>
              <Nav.Link
                href="#cookbook"
                active={activeView === VIEWS.COOKBOOK}
                onClick={() => setActiveView(VIEWS.COOKBOOK)}
              >
                COOKBOOK
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
