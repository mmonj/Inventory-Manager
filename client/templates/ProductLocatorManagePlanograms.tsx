import React, { useContext, useState } from "react";

import { Context, interfaces, reverse, templates } from "@reactivated";
import { parseISO } from "date-fns";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { Alert, Badge, Button, Card, ListGroup } from "react-bootstrap";
import Select from "react-select";

import { faPencilAlt, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Layout } from "@client/components/Layout";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { EditPlanogramModal } from "@client/components/productLocator/EditPlanogramModal";
import { NavigationBar } from "@client/components/productLocator/NavigationBar";
import { useFetch } from "@client/hooks/useFetch";
import { fetchByReactivated } from "@client/util/commonUtil";
import { getPlanogramSections } from "@client/util/productLocator/planogramUtil";
import { toast } from "@client/util/toast";

import "@client/scss/product_locator/monospace-text.scss";

type SelectOption = { value: number; label: string };
type EditablePlanogram = React.ComponentProps<typeof EditPlanogramModal>["planogram"];

export function Template(props: templates.ProductLocatorManagePlanograms) {
  const [selectedStore, setSelectedStore] = useState<SelectOption | null>(null);
  const [editingPlanogram, setEditingPlanogram] = useState<EditablePlanogram | null>(null);
  const djangoContext = useContext(Context);
  const planogramsFetcher = useFetch<interfaces.IPlanogramsByStore>();
  const createPlanogramFetcher = useFetch<interfaces.IPlanogramCreated>();

  async function refetchPlanograms() {
    if (selectedStore) {
      await planogramsFetcher.fetchData(() =>
        fetchByReactivated<interfaces.IPlanogramsByStore>(
          reverse("product_locator:get_planograms_by_store", { store_id: selectedStore.value }),
          djangoContext.csrf_token,
          "GET"
        )
      );
    }
  }

  const storeOptions: SelectOption[] = props.stores.map((store) => ({
    value: store.pk,
    label: store.name,
  }));

  async function handleStoreChange(option: SelectOption | null) {
    setSelectedStore(option);

    if (option) {
      await planogramsFetcher.fetchData(() =>
        fetchByReactivated<interfaces.IPlanogramsByStore>(
          reverse("product_locator:get_planograms_by_store", { store_id: option.value }),
          djangoContext.csrf_token,
          "GET"
        )
      );
    }
  }

  async function handleDeletePlanogram(planogramId: number, planogramName: string) {
    const firstConfirm = window.confirm(
      `Are you sure you want to delete the planogram "${planogramName}"?\n\nThis action cannot be undone.`
    );

    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      `FINAL CONFIRMATION: Delete "${planogramName}"?\n\nThis will permanently remove the planogram and all associated data.`
    );

    if (!secondConfirm) return;

    try {
      await fetchByReactivated<interfaces.ISuccess>(
        reverse("product_locator:delete_planogram", { planogram_id: planogramId }),
        djangoContext.csrf_token,
        "DELETE"
      );

      await refetchPlanograms();
    } catch (error) {
      alert(`Failed to delete planogram: ${String(error)}`);
    }
  }

  async function handleCreatePlanogram(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedStore) return;

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const name = formData.get("name") as string;
    const planoType = formData.get("plano_type") as string;
    const thresholdsRaw = (formData.get("horizontal_section_thresholds") as string).trim();
    const planogramTextDump = formData.get("planogram_text_dump") as string;

    const horizontalSectionThresholds = thresholdsRaw
      ? thresholdsRaw
          .split(/[\s,]+/)
          .filter(Boolean)
          .map((token) => token.toUpperCase())
      : undefined;

    if (
      horizontalSectionThresholds !== undefined &&
      horizontalSectionThresholds.some((token) => token.length !== 1)
    ) {
      alert("Each section threshold must be a single character (e.g. G, J).");
      return;
    }

    const [isSuccess, createdPlanogram] = await createPlanogramFetcher.fetchData(() =>
      fetchByReactivated<interfaces.IPlanogramCreated>(
        reverse("product_locator:create_planogram"),
        djangoContext.csrf_token,
        "POST",
        JSON.stringify({
          name,
          plano_type: planoType,
          store_id: selectedStore.value,
          horizontal_section_thresholds: horizontalSectionThresholds,
          planogram_text_dump: planogramTextDump,
        })
      )
    );

    if (isSuccess) {
      formElement.reset();

      if (createdPlanogram.num_products_parsed > 0) {
        toast.success(
          `Created "${createdPlanogram.planogram.name}" with ${String(createdPlanogram.num_products_added)} of ${String(createdPlanogram.num_products_parsed)} item(s).`
        );
      } else {
        toast.success(`Created "${createdPlanogram.planogram.name}".`);
      }

      try {
        await refetchPlanograms();
      } catch (error) {
        console.error("Failed to refresh planograms after creating a new one:", error);
      }
    }
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
        {planogramsFetcher.isLoading && (
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body className="p-4 text-center">
              <LoadingSpinner isBlockElement={true} />
              <p className="text-muted mt-2">Loading planograms...</p>
            </Card.Body>
          </Card>
        )}

        {/* Error state */}
        {planogramsFetcher.errorMessages.length > 0 && (
          <Alert variant="danger" className="mb-4">
            <strong>Error loading planograms:</strong>
            <ul className="mb-0 mt-2">
              {planogramsFetcher.errorMessages.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Planograms List */}
        {selectedStore && !planogramsFetcher.isLoading && planogramsFetcher.data && (
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Planograms for {selectedStore.label}</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {planogramsFetcher.data.planograms.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <p className="mb-0">No planograms found for this store.</p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-light border-bottom">
                    <small className="text-muted">
                      {planogramsFetcher.data.planograms.length} planogram
                      {planogramsFetcher.data.planograms.length !== 1 ? "s" : ""} found
                    </small>
                  </div>
                  <LazyMotion features={domAnimation}>
                    {getPlanogramSections(planogramsFetcher.data.planograms).map((section) => (
                      <React.Fragment key={section.title}>
                        <div className="px-3 py-2 bg-light border-bottom small fw-semibold">
                          {section.title}
                        </div>
                        <ListGroup variant="flush">
                          <AnimatePresence mode="popLayout">
                            {section.storePlanograms.map(
                              ({ planogram, product_count: productCount }) => {
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
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() =>
                                          setEditingPlanogram({
                                            pk: planogram.pk,
                                            name: planogram.name,
                                            planoType: planogram.plano_type_info.value,
                                            dateEnd: planogram.date_end,
                                          })
                                        }
                                        title="Edit planogram"
                                      >
                                        <FontAwesomeIcon icon={faPencilAlt} />
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() =>
                                          handleDeletePlanogram(planogram.pk, planogram.name)
                                        }
                                        title="Delete planogram"
                                      >
                                        <FontAwesomeIcon icon={faTrash} />
                                      </Button>
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
        {selectedStore && !planogramsFetcher.isLoading && (
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
                  disabled={createPlanogramFetcher.isLoading}
                >
                  Create Planogram
                  {createPlanogramFetcher.isLoading && (
                    <LoadingSpinner isBlockElement={false} spinnerVariant="light" size="sm" />
                  )}
                </Button>

                {createPlanogramFetcher.isError && (
                  <Alert variant="danger" className="mt-3 mb-0">
                    <ul className="mb-0">
                      {createPlanogramFetcher.errorMessages.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
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
          onSuccess={refetchPlanograms}
        />
      )}
    </Layout>
  );
}
