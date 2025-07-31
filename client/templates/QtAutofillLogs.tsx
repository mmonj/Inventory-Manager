import React, { useEffect, useState } from "react";

import { templates } from "@reactivated";
import { Alert, Badge, Button, Card, Col, Collapse, Form, InputGroup, Row } from "react-bootstrap";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";

function getMessageTypeVariant(messageType: string): string {
  switch (messageType.toLowerCase()) {
    case "info":
      return "info";
    case "exception":
      return "danger";
    case "warning":
      return "warning";
    case "error":
      return "danger";
    default:
      return "secondary";
  }
}

export default function Template(props: templates.QtAutofillLogs) {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredLogs = props.logs
    .filter((log) => {
      const matchesType = filterType === "all" || log.message_type === filterType;
      const matchesSearch =
        debouncedSearchTerm === "" ||
        log.message.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        log.service_order.store.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        log.service_order.soid.toString().includes(debouncedSearchTerm.toLowerCase());

      return matchesType && matchesSearch;
    })
    .sort((a, b) => b.id - a.id); // Sort by ID descending (largest first)

  function toggleLogExpansion(logId: number) {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  }

  const logCounts = {
    info: 0,
    warning: 0,
    error: 0,
    exception: 0,
  };

  for (const log of props.logs) {
    if (log.message_type in logCounts) {
      logCounts[log.message_type as keyof typeof logCounts]++;
    }
  }

  return (
    <Layout title="Autofill Logs" navbar={<NavigationBar />} className="container-fluid py-2">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">📊 Autofill Logs</h1>
        <Badge bg="secondary" className="fs-6">
          {filteredLogs.length} of {props.logs.length} logs
        </Badge>
      </div>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-info">
            <Card.Body className="text-center">
              <h5 className="text-info mb-1">{logCounts.info || 0}</h5>
              <small className="text-muted">Info Messages</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-warning">
            <Card.Body className="text-center">
              <h5 className="text-warning mb-1">{logCounts.warning || 0}</h5>
              <small className="text-muted">Warnings</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-danger">
            <Card.Body className="text-center">
              <h5 className="text-danger mb-1">{logCounts.error || 0}</h5>
              <small className="text-muted">Errors</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-danger">
            <Card.Body className="text-center">
              <h5 className="text-danger mb-1">{logCounts.exception || 0}</h5>
              <small className="text-muted">Exceptions</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  <strong>Filter by Message Type</strong>
                </Form.Label>
                <Form.Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="exception">Exception</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  <strong>Search Logs</strong>
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Search by message, store name, or service order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setSearchTerm("")}
                    disabled={searchTerm === ""}
                  >
                    Clear
                  </Button>
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <Alert variant="info" className="text-center">
          <h5 className="text-dark">No logs found</h5>
          <p className="mb-0">
            {props.logs.length === 0
              ? "There are no autofill logs to display."
              : "No logs match your current filters. Try adjusting your search criteria."}
          </p>
        </Alert>
      ) : (
        <div className="row">
          {filteredLogs.map((log) => (
            <div key={log.id} className="col-12 mb-3">
              <Card className={`border-${getMessageTypeVariant(log.message_type)} shadow-sm`}>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <Badge bg={getMessageTypeVariant(log.message_type)} className="me-2">
                      {log.message_type.toUpperCase()}
                    </Badge>
                    <strong>Service Order: {log.service_order.soid}</strong>
                  </div>
                  <div className="d-flex align-items-center">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => toggleLogExpansion(log.id)}
                    >
                      {expandedLogs.has(log.id) ? "Collapse" : "Expand"}
                    </Button>
                  </div>
                </Card.Header>

                <Card.Body>
                  <Row className="mb-2">
                    <Col md={6}>
                      <small className="text-muted">
                        <strong>Store:</strong> {log.service_order.store.name}
                      </small>
                    </Col>
                    <Col md={6} className="text-end">
                      <small className="text-muted">
                        <strong>Created:</strong>{" "}
                        {new Date(log.datetime_created as string).toLocaleString()}
                      </small>
                    </Col>
                  </Row>

                  <Collapse in={expandedLogs.has(log.id)}>
                    <div>
                      <hr className="my-2" />
                      <div>
                        <strong className="d-block mb-2">Message:</strong>
                        <pre
                          className="bg-light p-3 rounded border"
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontSize: "0.875rem",
                            maxHeight: "300px",
                            overflowY: "auto",
                          }}
                        >
                          {log.message || "No message content"}
                        </pre>
                      </div>
                    </div>
                  </Collapse>

                  {!expandedLogs.has(log.id) && log.message && (
                    <div className="mt-2">
                      <small className="text-muted">
                        {log.message.length > 100
                          ? `${log.message.substring(0, 100)}...`
                          : log.message}
                      </small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
