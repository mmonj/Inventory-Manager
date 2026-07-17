import React, { useContext, useState } from "react";

import { Context, interfaces, reverse, templates } from "@reactivated";
import { Accordion, Alert, Badge, Button, Card, ListGroup } from "react-bootstrap";

import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/productLocator/NavigationBar";
import { useFetch } from "@client/hooks/useFetch";
import { fetchByReactivated } from "@client/util/commonUtil";
import {
  IProductMove,
  chaseProductMoves,
  findEmptiedLocations,
} from "@client/util/productLocator/chaseMoves";

type TPlanogramUpdate = templates.ProductLocatorPlanogramUpdates["planogram_updates"][number];

function getChangedLocations(planogramUpdate: TPlanogramUpdate): string[] {
  const { old_plano, new_plano } = planogramUpdate;
  const allLocations = new Set([...Object.keys(old_plano), ...Object.keys(new_plano)]);

  return [...allLocations].filter((location) => {
    const oldProduct = old_plano[location];
    const newProduct = new_plano[location];
    return oldProduct?.upc !== newProduct?.upc;
  });
}

export default function Template(props: templates.ProductLocatorPlanogramUpdates) {
  const [selectedUpdate, setSelectedUpdate] = useState<TPlanogramUpdate | null>(null);
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

  const moveChains: IProductMove[][] = selectedUpdate
    ? chaseProductMoves(
        selectedUpdate.old_plano,
        selectedUpdate.new_plano,
        getChangedLocations(selectedUpdate)
      )
    : [];

  const emptiedLocations: string[] = selectedUpdate
    ? findEmptiedLocations(
        selectedUpdate.old_plano,
        selectedUpdate.new_plano,
        getChangedLocations(selectedUpdate)
      )
    : [];

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
      setSelectedUpdate((prev) => (prev ? { ...prev, is_applied: true } : prev));
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
                    disabled={planogramUpdate.is_applied}
                    className={planogramUpdate.is_applied ? "text-muted bg-light" : ""}
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
                      {planogramUpdate.is_applied && <Badge bg="secondary">Applied</Badge>}
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
                  {!selectedUpdate.is_applied && (
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
                  <Alert variant="success">This update was successfully applied.</Alert>
                ) : (
                  selectedUpdate.is_applied && (
                    <Alert variant="secondary">This update has already been applied.</Alert>
                  )
                )}

                {emptiedLocations.length > 0 && (
                  <Alert variant="warning" className="mb-4">
                    <strong>The following locations should be emptied out</strong> as their products
                    are no longer part of the new planogram:
                    <ul
                      className="mb-0 mt-2"
                      style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
                    >
                      {emptiedLocations.map((location) => (
                        <li key={location}>
                          <strong>{location}</strong> — {selectedUpdate.old_plano[location].name} (
                          {selectedUpdate.old_plano[location].upc})
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {moveChains.length === 0 ? (
                  <p className="text-muted mb-0">No product location changes detected.</p>
                ) : (
                  moveChains.map((chain, chainIdx) => (
                    <div key={chainIdx} className={chainIdx > 0 ? "mt-4" : ""}>
                      <div className="d-flex align-items-center mb-2">
                        <small className="text-uppercase text-muted fw-bold">
                          Chain {chainIdx + 1}
                        </small>
                        <hr className="flex-grow-1 ms-2" />
                      </div>
                      <ListGroup variant="flush" className="border rounded">
                        {chain.map((move) => {
                          const moveKey = move.fromLocation;
                          const isCompleted = completedMoves.has(moveKey);
                          return (
                            <ListGroup.Item
                              key={moveKey}
                              action
                              onClick={() => toggleMoveCompleted(moveKey)}
                              style={{ cursor: "pointer" }}
                              className="d-flex align-items-center justify-content-between gap-2"
                            >
                              <span
                                style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
                                className={
                                  isCompleted ? "text-decoration-line-through text-muted" : ""
                                }
                              >
                                <strong>
                                  {move.fromLocation} → {move.toLocation}
                                </strong>{" "}
                                - Product {move.product.name} ({move.product.upc})
                              </span>
                              <FontAwesomeIcon
                                icon={faCircleCheck}
                                className={
                                  isCompleted ? "text-success" : "text-secondary opacity-25"
                                }
                                size="lg"
                              />
                            </ListGroup.Item>
                          );
                        })}
                      </ListGroup>
                    </div>
                  ))
                )}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        )}
      </section>
    </Layout>
  );
}
