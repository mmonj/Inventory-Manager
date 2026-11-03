import React, { useState } from "react";

import { templates } from "@reactivated";
import { parseISO } from "date-fns";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { Alert, Badge, Button, Card, Dropdown, ListGroup } from "react-bootstrap";
import Select from "react-select";

import { faEraser, faList, faPencilAlt, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Layout } from "@client/components/Layout";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { EditPlanogramModal } from "@client/components/productLocator/EditPlanogramModal";
import { NavigationBar } from "@client/components/productLocator/NavigationBar";
import { PlanogramProductsModal } from "@client/components/productLocator/PlanogramProductsModal";
import { usePlanogramList } from "@client/hooks/productLocator/usePlanogramList";
import { getErrorMessages } from "@client/util/commonUtil";
import {
  getPlanogramSections,
  parseHorizontalSectionThresholds,
} from "@client/util/productLocator/planogramUtil";
import { toast } from "@client/util/toast";

import "@client/scss/product_locator/monospace-text.scss";

type SelectOption = { value: number; label: string };
type EditablePlanogram = React.ComponentProps<typeof EditPlanogramModal>["planogram"];
type ViewedPlanogram = { pk: number; name: string; hasPendingUpdate: boolean };

export function Template(props: templates.ProductLocatorManagePlanograms) {
  const [selectedStore, setSelectedStore] = useState<SelectOption | null>(null);
  const [editingPlanogram, setEditingPlanogram] = useState<EditablePlanogram | null>(null);
  const [viewingPlanogram, setViewingPlanogram] = useState<ViewedPlanogram | null>(null);
  const planogramList = usePlanogramList(selectedStore?.value ?? null);
  const { planograms, isListLoading, listErrorMessages } = planogramList;

  const storeOptions: SelectOption[] = props.stores.map((store) => ({
    value: store.pk,
    label: store.name,
  }));

  function handleStoreChange(option: SelectOption | null) {
    setSelectedStore(option);
  }

  function handleDeletePlanogram(planogramId: number, planogramName: string) {
    const firstConfirm = window.confirm(
      `Are you sure you want to delete the planogram "${planogramName}"?\n\nThis action cannot be undone.`
    );

    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      `FINAL CONFIRMATION: Delete "${planogramName}"?\n\nThis will permanently remove the planogram and all associated data.`
    );

    if (!secondConfirm) return;

    planogramList.deletePlanogram.mutateAsync(planogramId).catch((error: Error) => {
      toast.error(`Failed to delete "${planogramName}".`, ...getErrorMessages(error));
    });
  }

  function handleClearPlanogram(
    planogramId: number,
    planogramName: string,
    productCount: number,
    hasPendingUpdate: boolean
  ) {
    const pendingUpdateNote = hasPendingUpdate
      ? "\n\nIts pending planogram update will stay pending."
      : "";

    const firstConfirm = window.confirm(
      `Are you sure you want to clear the planogram "${planogramName}"?\n\nThis will remove its ${String(productCount)} product(s) and cannot be undone.${pendingUpdateNote}`
    );

    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      `FINAL CONFIRMATION: Clear "${planogramName}"?\n\nThis will remove all ${String(productCount)} product(s) from the planogram.`
    );

    if (!secondConfirm) return;

    planogramList.clearPlanogram
      .mutateAsync(planogramId)
      .then((clearedPlanogram) => {
        toast.success(
          `Cleared "${planogramName}": ${String(clearedPlanogram.num_products_removed)} product(s) removed.`
        );
      })
      .catch((error: Error) => {
        toast.error(`Failed to clear "${planogramName}".`, ...getErrorMessages(error));
      });
  }

  function handleCreatePlanogram(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedStore) return;

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const thresholdsResult = parseHorizontalSectionThresholds(
      formData.get("horizontal_section_thresholds") as string
    );

    if (!thresholdsResult.ok) {
      alert(thresholdsResult.errorMessage);
      return;
    }

    planogramList.createPlanogram
      .mutateAsync({
        storeId: selectedStore.value,
        body: {
          name: formData.get("name") as string,
          plano_type: formData.get("plano_type") as string,
          horizontal_section_thresholds: thresholdsResult.thresholds ?? null,
          planogram_text_dump: formData.get("planogram_text_dump") as string,
        },
      })
      .then((createdPlanogram) => {
        formElement.reset();

        if (createdPlanogram.num_products > 0) {
          toast.success(
            `Created "${createdPlanogram.planogram.name}" with ${String(createdPlanogram.num_products)} product(s).`
          );
        } else {
          toast.success(`Created "${createdPlanogram.planogram.name}".`);
        }
      })
      .catch((error: Error) => {
        toast.error("Failed to create the planogram.", ...getErrorMessages(error));
      });
  }

  return (
    <Layout title="Manage Planograms" navbar={<NavigationBar />}>
      <section className="mw-rem-70 mx-auto p-3">
        <h1 className="m-3 text-center">Manage Planograms</h1>

        {/* Store Selection */}
        <Card className="shadow-sm border-0 mb-4">
          <Card.Body className="p-4">
            <h5 className="mb-3">Select Store</h5>
            <Select
              options={storeOptions}
              value={selectedStore}
              onChange={handleStoreChange}
              placeholder="Select a store..."
              isClearable
              classNamePrefix="react-select"
            />
          </Card.Body>
        </Card>

        {/* Loading state */}
        {isListLoading && (
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body className="p-4 text-center">
              <LoadingSpinner isBlockElement={true} />
              <p className="text-muted mt-2">Loading planograms...</p>
            </Card.Body>
          </Card>
        )}

        {/* Error state */}
        {listErrorMessages.length > 0 && (
          <Alert variant="danger" className="mb-4">
            <strong>Error loading planograms:</strong>
            <ul className="mb-0 mt-2">
              {listErrorMessages.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Planograms List */}
        {selectedStore && !isListLoading && planograms && (
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Planograms for {selectedStore.label}</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {planograms.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <p className="mb-0">No planograms found for this store.</p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-light border-bottom">
                    <small className="text-muted">
                      {planograms.length} planogram
                      {planograms.length !== 1 ? "s" : ""} found
                    </small>
                  </div>
                  <LazyMotion features={domAnimation}>
                    {getPlanogramSections(planograms).map((section) => (
                      <React.Fragment key={section.title}>
                        <div className="px-3 py-2 bg-light border-bottom small fw-semibold">
                          {section.title}
                        </div>
                        <ListGroup variant="flush">
                          <AnimatePresence mode="popLayout">
                            {section.storePlanograms.map(
                              ({
                                planogram,
                                product_count: productCount,
                                has_pending_update: hasPendingUpdate,
                              }) => {
                                const isSeasonal = planogram.plano_type_info.value === "seasonal";
                                return (
                                  <ListGroup.Item
                                    key={planogram.pk}
                                    as={m.div}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="d-flex justify-content-between align-items-center"
                                  >
                                    <div>
                                      <h6 className="mb-1 fw-bold">{planogram.name}</h6>
                                      <small className="text-muted">
                                        Started:{" "}
                                        {parseISO(planogram.date_start).toLocaleDateString()}
                                        {" · "}
                                        {planogram.date_end !== null && (
                                          <>
                                            Ends:{" "}
                                            {parseISO(planogram.date_end).toLocaleDateString()}
                                            {" · "}
                                          </>
                                        )}
                                        {productCount} product{productCount !== 1 ? "s" : ""}
                                      </small>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                      <Badge
                                        bg={isSeasonal ? "warning" : "info"}
                                        text={isSeasonal ? "light" : "white"}
                                      >
                                        {planogram.plano_type_info.label}
                                      </Badge>
                                      <Dropdown align="end">
                                        <Dropdown.Toggle variant="outline-secondary" size="sm">
                                          Actions
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                          <Dropdown.Item
                                            onClick={() =>
                                              setEditingPlanogram({
                                                pk: planogram.pk,
                                                name: planogram.name,
                                                planoType: planogram.plano_type_info.value,
                                                dateEnd: planogram.date_end,
                                              })
                                            }
                                          >
                                            <FontAwesomeIcon icon={faPencilAlt} className="me-2" />
                                            Edit
                                          </Dropdown.Item>
                                          <Dropdown.Item
                                            disabled={productCount === 0}
                                            onClick={() =>
                                              setViewingPlanogram({
                                                pk: planogram.pk,
                                                name: planogram.name,
                                                hasPendingUpdate,
                                              })
                                            }
                                          >
                                            <FontAwesomeIcon icon={faList} className="me-2" />
                                            Show Products
                                          </Dropdown.Item>
                                          <Dropdown.Item
                                            className={productCount > 0 ? "text-danger" : undefined}
                                            disabled={productCount === 0}
                                            onClick={() =>
                                              handleClearPlanogram(
                                                planogram.pk,
                                                planogram.name,
                                                productCount,
                                                hasPendingUpdate
                                              )
                                            }
                                          >
                                            <FontAwesomeIcon icon={faEraser} className="me-2" />
                                            Clear Planogram
                                          </Dropdown.Item>
                                          <Dropdown.Divider />
                                          <Dropdown.Item
                                            className="text-danger"
                                            onClick={() =>
                                              handleDeletePlanogram(planogram.pk, planogram.name)
                                            }
                                          >
                                            <FontAwesomeIcon icon={faTrash} className="me-2" />
                                            Delete
                                          </Dropdown.Item>
                                        </Dropdown.Menu>
                                      </Dropdown>
                                    </div>
                                  </ListGroup.Item>
                                );
                              }
                            )}
                          </AnimatePresence>
                        </ListGroup>
                      </React.Fragment>
                    ))}
                  </LazyMotion>
                </>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Create New Planogram Form */}
        {selectedStore && !isListLoading && (
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">
                Create New Planogram for <span className="fw-bold">{selectedStore.label}</span>
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <form onSubmit={handleCreatePlanogram}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label fw-bold">
                    Planogram Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    placeholder="Enter planogram name"
                    defaultValue={props.default_plano_name}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="plano_type" className="form-label fw-bold">
                    Planogram Type
                  </label>
                  <select className="form-select" id="plano_type" name="plano_type" required>
                    {props.plano_type_choices.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="horizontal_section_thresholds" className="form-label fw-bold">
                    Horizontal Section Thresholds
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="horizontal_section_thresholds"
                    name="horizontal_section_thresholds"
                    placeholder="Optional, e.g. G, J"
                  />
                  <div className="form-text">
                    Optional. Enter single-character section letters separated by commas or spaces.
                    The section letter(s) will indicate the row letter(s) after which a visual
                    separator is created when displaying the planogram grid.
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="planogram_text_dump" className="form-label fw-bold">
                    Planogram Text Dump
                  </label>
                  <textarea
                    className="form-control monospace-text"
                    id="planogram_text_dump"
                    name="planogram_text_dump"
                    rows={10}
                  />
                  <div className="form-text">
                    Optional. Leave blank to create an empty planogram.
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="success"
                  className="w-100"
                  disabled={planogramList.createPlanogram.isPending}
                >
                  Create Planogram
                  {planogramList.createPlanogram.isPending && (
                    <LoadingSpinner isBlockElement={false} spinnerVariant="light" size="sm" />
                  )}
                </Button>
              </form>
            </Card.Body>
          </Card>
        )}
      </section>

      {editingPlanogram && (
        <EditPlanogramModal
          show={true}
          onHide={() => setEditingPlanogram(null)}
          storeName={selectedStore?.label ?? ""}
          planogram={editingPlanogram}
          planoTypeChoices={props.plano_type_choices}
          onSuccess={() => void planogramList.refreshPlanograms()}
        />
      )}

      {viewingPlanogram && (
        <PlanogramProductsModal
          onHide={() => setViewingPlanogram(null)}
          planogramId={viewingPlanogram.pk}
          planogramName={viewingPlanogram.name}
          storeName={selectedStore?.label ?? ""}
          hasPendingUpdate={viewingPlanogram.hasPendingUpdate}
        />
      )}
    </Layout>
  );
}
