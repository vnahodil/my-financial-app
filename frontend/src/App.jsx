// src/App.jsx
import React, { useState } from 'react';

// Import React-Bootstrap layout components
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// Import your custom components
import Sidebar, { VIEWS } from './Sidebar'; // Import VIEWS constant
import ItemsView from './ItemsView'; // Changed import
import ProfileView from './ProfileView';

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
      default:
        return <ItemsView />; // Fallback to items view
    }
  };

  return (
    // Use fluid container to take full width
    <Container fluid>
      <Row>
        {/* Sidebar Column */}
        {/* Adjust column sizes for different breakpoints (sm, md, lg) */}
        <Col sm={3} md={2} className="p-0"> {/* p-0 to remove padding */}
          <Sidebar activeView={activeView} setActiveView={setActiveView} />
        </Col>

        {/* Content Area Column - Apply custom class and remove default padding */}
        <Col sm={9} md={10} className="content-area"> {/* Use content-area class */}
          {/* Render the component returned by renderActiveView */}
          {renderActiveView()}
        </Col>
      </Row>
    </Container>
  );
}

export default App;
