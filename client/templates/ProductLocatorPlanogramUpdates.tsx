import React, { useContext, useState } from "react";

import { Context, interfaces, reverse, templates } from "@reactivated";
import { Accordion, Alert, Badge, Button, Card, ListGroup } from "react-bootstrap";

import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/productLocator/NavigationBar";
import { useFetch } from "@client/hooks/useFetch";
import { fetchByReactivated } from "@client/util/commonUtil";
import { type TChainStep, buildMovePlan } from "@client/util/productLocator/movePlan";

type TPlanogramUpdate = templates.ProductLocatorPlanogramUpdates["planogram_updates"][number];

function describeStep(step: TChainStep): string {
  switch (step.kind) {
    case "move":
      return `${step.fromLocation} → ${step.toLocation}`;
    case "pullAside":
      return `Pull aside from ${step.location}`;
    case "place":
      return `Place in ${step.location}`;
  }
}

export function Template(props: templates.ProductLocatorPlanogramUpdates) {
  const [selectedUpdate, setSelectedUpdate] = useState<TPlanogramUpdate | null>(null);
  // The move checklist only helps whoever is physically rearranging the shelf: applying an
  // update replaces the planogram's locations with new_plano server-side regardless of what's
  // checked off, so this state is deliberately not persisted.
  const [completedMoves, setCompletedMoves] = useState<Set<string>>(new Set());
  const djangoContext = useContext(Context);
  const applyFetcher = useFetch<interfaces.IPlanogramUpdateApplied>();

  function toggleMoveCompleted(moveKey: string) {
    setCompletedMoves((prev) => {
      const next = new Set(prev);
      if (next.has(moveKey)) {
        next.delete(moveKey);
      } else {
        next.add(moveKey);
      }
      return next;
    });
  }

  const movePlan = selectedUpdate
    ? buildMovePlan(selectedUpdate.old_plano, selectedUpdate.new_plano)
    : null;

  async function handleApply(planogramUpdate: TPlanogramUpdate) {
    const confirmed = window.confirm(
      `Apply planogram update "${planogramUpdate.label}"?\n\nThis will replace the current locations for planogram "${planogramUpdate.planogram.name}".`
    );
    if (!confirmed) return;

    const [isSuccess] = await applyFetcher.fetchData(() =>
      fetchByReactivated<interfaces.IPlanogramUpdateApplied>(
        reverse("product_locator:apply_planogram_update", {
          planogram_update_id: planogramUpdate.pk,
        }),
        djangoContext.csrf_token,
        "POST"
      )
    );

    if (isSuccess) {
      setSelectedUpdate((prev) => (prev ? { ...prev, status: "applied" } : prev));
    }
  }

  return (
    <Layout title="Planogram Updates" navbar={<NavigationBar />}>
      <section className="mw-rem-70 mx-auto p-3">
        <h1 className="m-3 text-center">Planogram Updates</h1>

        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">Pending &amp; Recent Updates</h5>
          </Card.Header>
          <Card.Body className="p-0">
            {props.planogram_updates.length === 0 ? (
              <div className="p-4 text-center text-muted">
                <p className="mb-0">No planogram updates found.</p>
              </div>
            ) : (
              <ListGroup variant="flush">
                {props.planogram_updates.map((planogramUpdate) => (
                  <ListGroup.Item
                    key={planogramUpdate.pk}
                    action
                    active={selectedUpdate?.pk === planogramUpdate.pk}
                    disabled={planogramUpdate.status !== "pending"}
                    className={planogramUpdate.status !== "pending" ? "text-muted bg-light" : ""}
                    onClick={() => {
                      setSelectedUpdate(planogramUpdate);
                      setCompletedMoves(new Set());
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <span className="fw-bold">{planogramUpdate.label}</span>{" "}
                        <small className="text-muted">
                          {planogramUpdate.planogram.store?.name ?? "No Store"} -{" "}
                          {planogramUpdate.planogram.name}
                        </small>
                      </div>
                      {planogramUpdate.status === "applied" && (
                        <Badge bg="secondary">Applied</Badge>
                      )}
                      {planogramUpdate.status === "superseded" && (
                        <Badge bg="light" text="dark">
                          Superseded
                        </Badge>
                      )}
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card.Body>
        </Card>

        {selectedUpdate && (
          <Accordion alwaysOpen defaultActiveKey="selected-update">
            <Accordion.Item eventKey="selected-update" className="shadow-sm">
              <Accordion.Header>
                <span className="fw-bold text-dark">{selectedUpdate.label}</span>
              </Accordion.Header>
              <Accordion.Body className="p-4">
                <div className="d-flex justify-content-end mb-3">
                  {selectedUpdate.status === "pending" && (
                    <Button
                      variant="success"
                      size="sm"
                      disabled={applyFetcher.isLoading}
                      onClick={() => handleApply(selectedUpdate)}
                    >
                      Put new Planogram into effect
                    </Button>
                  )}
                </div>

                {applyFetcher.errorMessages.length > 0 && (
                  <Alert variant="danger">
                    <ul className="mb-0">
                      {applyFetcher.errorMessages.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {applyFetcher.data?.planogram_update.pk === selectedUpdate.pk ? (
                  <Alert variant="success">
                    Removed {applyFetcher.data.num_locations_removed} previous location
                    {applyFetcher.data.num_locations_removed === 1 ? "" : "s"}. Added{" "}
                    {applyFetcher.data.num_locations_added} new location
                    {applyFetcher.data.num_locations_added === 1 ? "" : "s"}.
                  </Alert>
                ) : (
                  selectedUpdate.status === "applied" && (
                    <Alert variant="secondary">This update has already been applied.</Alert>
                  )
                )}

                {movePlan && movePlan.productsToPull.length > 0 && (
                  <Alert variant="warning" className="mb-4">
                    <strong>The following products should be pulled</strong> as the new planogram
                    has no place for them at these locations:
                    <ul
                      className="mb-0 mt-2"
                      style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
                    >
                      {movePlan.productsToPull.map(({ location, product }) => (
                        <li key={`${location}:${product.upc}`}>
                          <strong>{location}</strong> — {product.name} ({product.upc})
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {movePlan?.chains.length === 0 && movePlan.productsToPull.length === 0 && (
                  <p className="text-muted mb-0">No cards need moving or pulling.</p>
                )}

                {movePlan?.chains.map(({ route, steps, isCircular, deadEndPulls }, chainIdx) => (
                  <div key={chainIdx} className={chainIdx > 0 ? "mt-4" : ""}>
                    <div className="d-flex align-items-center mb-2">
                      <small className="text-uppercase text-muted fw-bold">
                        Chain {chainIdx + 1}
                      </small>
                      <hr className="flex-grow-1 ms-2" />
                    </div>
                    <p
                      className="text-muted mb-2"
                      style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
                    >
                      {route.join(" → ")}
                    </p>
                    {isCircular && (
                      <p className="text-info fw-semibold mb-2">
                        This chain is circular, so every location in it is full. Pull one card aside
                        to free a location, then place that card last.
                      </p>
                    )}
                    {deadEndPulls.map(({ location, product }) => (
                      <p key={product.upc} className="text-warning fw-semibold mb-2">
                        Pull {product.name} ({product.upc}) from{" "}
                        <span style={{ fontFamily: 'Consolas, "Courier New", monospace' }}>
                          {location}
                        </span>{" "}
                        first. It no longer belongs there.
                      </p>
                    ))}
                    <ListGroup variant="flush" className="border rounded">
                      {steps.map((step) => {
                        const isCompleted = completedMoves.has(step.key);
                        return (
                          <ListGroup.Item
                            key={step.key}
                            action
                            onClick={() => toggleMoveCompleted(step.key)}
                            style={{ cursor: "pointer" }}
                            className="d-flex align-items-center justify-content-between gap-2"
                          >
                            <span
                              style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
                              className={
                                isCompleted ? "text-decoration-line-through text-muted" : ""
                              }
                            >
                              <strong>{describeStep(step)}</strong> - {step.product.name} (
                              {step.product.upc})
                            </span>
                            <FontAwesomeIcon
                              icon={faCircleCheck}
                              className={isCompleted ? "text-success" : "text-secondary opacity-25"}
                              size="lg"
                            />
                          </ListGroup.Item>
                        );
                      })}
                    </ListGroup>
                  </div>
                ))}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        )}
      </section>
    </Layout>
  );
}
