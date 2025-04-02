import React from 'react';
import { Container, Row, Col, Card, Image, Badge, ListGroup, ProgressBar } from 'react-bootstrap';
import { Briefcase, Mortarboard, CodeSlash, PersonCircle, Linkedin, Github, Envelope } from 'react-bootstrap-icons'; // Assuming react-bootstrap-icons is installed or will be

// Placeholder data - replace with actual data later
const profileData = {
  name: "Alex Chen",
  title: "Senior Software Engineer",
  tagline: "Building scalable web applications and driving innovation.",
  avatarUrl: "https://placehold.co/150x150/EFEFEF/AAAAAA&text=AC", // Simple placeholder image
  about: "Highly motivated and results-oriented Senior Software Engineer with 8+ years of experience in full-stack development, specializing in React, Node.js, and cloud technologies. Proven ability to lead projects, mentor junior developers, and deliver high-quality software solutions. Passionate about clean code, performance optimization, and creating exceptional user experiences.",
  experience: [
    { id: 1, title: "Senior Software Engineer", company: "Tech Solutions Inc.", period: "2020 - Present", description: "Led development of key features for the flagship product. Mentored junior engineers. Improved application performance by 20%." },
    { id: 2, title: "Software Engineer", company: "Web Innovators LLC", period: "2017 - 2020", description: "Developed and maintained client websites using React and Python/Django. Contributed to API design and implementation." },
  ],
  education: [
    { id: 1, degree: "M.S. in Computer Science", institution: "State University", period: "2015 - 2017" },
    { id: 2, degree: "B.S. in Software Engineering", institution: "City College", period: "2011 - 2015" },
  ],
  skills: [
    { id: 1, name: "JavaScript (ES6+)", level: 95 },
    { id: 2, name: "React & Redux", level: 90 },
    { id: 3, name: "Node.js & Express", level: 85 },
    { id: 4, name: "Python & Django", level: 75 },
    { id: 5, name: "SQL & NoSQL Databases", level: 80 },
    { id: 6, name: "AWS / Cloud Services", level: 70 },
    { id: 7, name: "Agile Methodologies", level: 90 },
    { id: 8, name: "Problem Solving", level: 95 },
  ],
  contact: {
    linkedin: "https://linkedin.com/in/alexchen",
    github: "https://github.com/alexchen",
    email: "alex.chen@email.com",
  }
};

function ProfileView() {
  return (
    <Container fluid className="py-4 px-md-5">
      {/* --- Hero Section --- */}
      <Row className="align-items-center mb-5 bg-light p-4 rounded shadow-sm">
        <Col md={3} className="text-center mb-3 mb-md-0">
          <Image src={profileData.avatarUrl} roundedCircle fluid style={{ width: '150px', height: '150px', objectFit: 'cover', border: '3px solid #dee2e6' }} />
        </Col>
        <Col md={9}>
          <h1>{profileData.name}</h1>
          <h4 className="text-muted mb-3">{profileData.title}</h4>
          <p className="lead">{profileData.tagline}</p>
          <div className="d-flex gap-3">
            <a href={profileData.contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary fs-4"><Linkedin /></a>
            <a href={profileData.contact.github} target="_blank" rel="noopener noreferrer" className="text-dark fs-4"><Github /></a>
            <a href={`mailto:${profileData.contact.email}`} className="text-secondary fs-4"><Envelope /></a>
          </div>
        </Col>
      </Row>

      <Row>
        {/* --- Left Column (About, Experience, Education) --- */}
        <Col lg={8}>
          {/* About Section */}
          <Card className="mb-4 shadow-sm">
            <Card.Header as="h5"><PersonCircle className="me-2" /> About Me</Card.Header>
            <Card.Body>
              <Card.Text>{profileData.about}</Card.Text>
            </Card.Body>
          </Card>

          {/* Experience Section */}
          <Card className="mb-4 shadow-sm">
            <Card.Header as="h5"><Briefcase className="me-2" /> Work Experience</Card.Header>
            <ListGroup variant="flush">
              {profileData.experience.map(exp => (
                <ListGroup.Item key={exp.id}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-0">{exp.title}</h6>
                      <small className="text-muted">{exp.company}</small>
                    </div>
                    <Badge bg="secondary" pill>{exp.period}</Badge>
                  </div>
                  <p className="mt-2 mb-0">{exp.description}</p>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>

          {/* Education Section */}
          <Card className="mb-4 shadow-sm">
            <Card.Header as="h5"><Mortarboard className="me-2" /> Education</Card.Header>
            <ListGroup variant="flush">
              {profileData.education.map(edu => (
                <ListGroup.Item key={edu.id}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-0">{edu.degree}</h6>
                      <small className="text-muted">{edu.institution}</small>
                    </div>
                    <Badge bg="light" text="dark">{edu.period}</Badge>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>

        {/* --- Right Column (Skills) --- */}
        <Col lg={4}>
          <Card className="shadow-sm">
            <Card.Header as="h5"><CodeSlash className="me-2" /> Skills</Card.Header>
            <Card.Body>
              {profileData.skills.map(skill => (
                <div key={skill.id} className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>{skill.name}</span>
                    {/* <span className="text-muted">{skill.level}%</span> */}
                  </div>
                  <ProgressBar now={skill.level} label={`${skill.level}%`} visuallyHidden={skill.level < 15} />
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default ProfileView;
