import React, { useContext, useState } from "react";

import { CSRFToken, Context, interfaces, reverse, templates } from "@reactivated";
import { Alert, Badge, Button, Card, ListGroup } from "react-bootstrap";
import Select from "react-select";

import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Layout } from "@client/components/Layout";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { NavigationBar } from "@client/components/productLocator/NavigationBar";
import { useFetch } from "@client/hooks/useFetch";
import { fetchByReactivated } from "@client/util/commonUtil";

type SelectOption = { value: number; label: string };

export default function Template(props: templates.ProductLocatorManagePlanograms) {
  const [selectedStore, setSelectedStore] = useState<SelectOption | null>(null);
  const djangoContext = useContext(Context);
  const planogramsFetcher = useFetch<interfaces.IPlanogramsByStore>();

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

      // Refresh the planograms list
      if (selectedStore) {
        await planogramsFetcher.fetchData(() =>
          fetchByReactivated<interfaces.IPlanogramsByStore>(
            reverse("product_locator:get_planograms_by_store", { store_id: selectedStore.value }),
            djangoContext.csrf_token,
            "GET"
          )
        );
      }
    } catch (error) {
      alert(`Failed to delete planogram: ${String(error)}`);
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
              <h5 className="mb-0">Active Planograms for {selectedStore.label}</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {planogramsFetcher.data.planograms.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <p className="mb-0">No active planograms found for this store.</p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-light border-bottom">
                    <small className="text-muted">
                      {planogramsFetcher.data.planograms.length} planogram
                      {planogramsFetcher.data.planograms.length !== 1 ? "s" : ""} found
                    </small>
                  </div>
                  <ListGroup variant="flush">
                    {[...planogramsFetcher.data.planograms]
                      .sort(
                        (a, b) =>
                          new Date(b.date_start).getTime() - new Date(a.date_start).getTime()
                      )
                      .map((planogram) => {
                        const isSeasonal = planogram.plano_type_info.value === "seasonal";
                        return (
                          <ListGroup.Item
                            key={planogram.pk}
                            className="d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <h6 className="mb-1 fw-bold">{planogram.name}</h6>
                              <small className="text-muted">
                                Started: {new Date(planogram.date_start).toLocaleDateString()}
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
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeletePlanogram(planogram.pk, planogram.name)}
                                title="Delete planogram"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            </div>
                          </ListGroup.Item>
                        );
                      })}
                  </ListGroup>
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
              <form method="POST" action={reverse("product_locator:manage_planograms")}>
                <CSRFToken />
                <input type="hidden" name="store" value={selectedStore.value} />

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

                <Button type="submit" variant="success" className="w-100">
                  Create Planogram
                </Button>
              </form>
            </Card.Body>
          </Card>
        )}
      </section>
    </Layout>
  );
}
