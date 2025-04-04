import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';

function LandingPageView({ onNavigate }) {
  return (
    <Container fluid className="d-flex align-items-end justify-content-center text-center" style={{ minHeight: 'calc(100vh - 200px)', paddingBottom: '5rem' }}>
      <Row>
        <Col>
          <h1 className="display-3 fw-bold mb-3">Stanislav Zmuda</h1>
          <p className="lead mb-4">
            Senior Software Engineer | Full-Stack Developer | Tech Enthusiast
          </p>
          <p className="mb-5">
            Welcome to my personal space. Explore my work, skills, and journey in the world of software development.
          </p>
          <Button 
            href='#profile'
            variant="primary"
            size="lg"
            className="cv-button" // Add custom class
            onClick={() => onNavigate && onNavigate('#profile')}
          >
            View My CV
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

export default LandingPageView;
