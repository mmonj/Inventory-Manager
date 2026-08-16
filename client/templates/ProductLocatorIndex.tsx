import React from "react";

import { Context, reverse, templates } from "@reactivated";

import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowCircleRight,
  faBarcode,
  faClipboardCheck,
  faCog,
  faSearchLocation,
  faShieldAlt,
  faShuffle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/productLocator/NavigationBar";

interface DashboardCardInfo {
  title: string;
  description: string;
  href: string;
  icon: IconDefinition;
  buttonIcon: IconDefinition;
  buttonLabel: string;
  colorVariant: string;
  buttonVariant: "solid" | "outline";
}

function DashboardCard(props: DashboardCardInfo) {
  const buttonClassName =
    props.buttonVariant === "solid"
      ? `btn btn-${props.colorVariant} btn-lg w-100 mt-3`
      : `btn btn-outline-${props.colorVariant} btn-lg w-100 mt-3`;

  return (
    <div className="col-md-6 col-lg-4">
      <div className="card h-100 border-0 shadow-sm hover-shadow transition">
        <div className="card-body d-flex flex-column p-4">
          <div className="mb-3">
            <div
              className={`bg-${props.colorVariant} bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center`}
              style={{ width: "60px", height: "60px" }}
            >
              <FontAwesomeIcon
                icon={props.icon}
                size="2x"
                className={`text-${props.colorVariant}`}
              />
            </div>
          </div>
          <h5 className="card-title fw-bold mb-2">{props.title}</h5>
          <p className="card-text text-muted flex-grow-1">{props.description}</p>
          <a href={props.href} className={buttonClassName}>
            <FontAwesomeIcon icon={props.buttonIcon} className="me-2" />
            {props.buttonLabel}
          </a>
        </div>
      </div>
    </div>
  );
}

export function Template(_props: templates.ProductLocatorIndex) {
  const context = React.useContext(Context);
  const { user } = context;

  const toolCards: DashboardCardInfo[] = [
    {
      title: "Scanner",
      description: "Scan barcodes in-store to quickly find where a product belongs",
      href: reverse("product_locator:scanner"),
      icon: faBarcode,
      buttonIcon: faArrowCircleRight,
      buttonLabel: "Open Scanner",
      colorVariant: "primary",
      buttonVariant: "solid",
    },
    {
      title: "Scan Audit",
      description: "Review which products have been scanned during a store audit",
      href: reverse("product_locator:scan_audit"),
      icon: faClipboardCheck,
      buttonIcon: faClipboardCheck,
      buttonLabel: "View Scan Audit",
      colorVariant: "success",
      buttonVariant: "outline",
    },
  ];

  const adminCards: DashboardCardInfo[] = [
    {
      title: "Manage Planograms",
      description: "Create, edit, and reset store planograms",
      href: reverse("product_locator:manage_planograms"),
      icon: faCog,
      buttonIcon: faCog,
      buttonLabel: "Manage Planograms",
      colorVariant: "danger",
      buttonVariant: "outline",
    },
    {
      title: "Planogram Updates",
      description: "Review and apply queued planogram updates",
      href: reverse("product_locator:planogram_updates"),
      icon: faShuffle,
      buttonIcon: faShuffle,
      buttonLabel: "View Planogram Updates",
      colorVariant: "danger",
      buttonVariant: "outline",
    },
  ];

  return (
    <Layout
      title="Product Locator Dashboard"
      navbar={<NavigationBar />}
      className="container-fluid py-5"
    >
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-9">
          {/* Header Section */}
          <div className="text-center mb-5">
            <h1 className="display-4 fw-bold mb-3">Product Locator Dashboard</h1>
            <p className="lead text-muted">Scan, locate, and manage product planograms</p>
          </div>

          {/* Main Section */}
          <div className="mb-5">
            <h3 className="h5 text-secondary mb-3">
              <FontAwesomeIcon icon={faSearchLocation} className="me-2" />
              Tools
            </h3>
            <div className="row g-4">
              {toolCards.map((card) => (
                <DashboardCard key={card.title} {...card} />
              ))}
            </div>
          </div>

          {user.is_superuser && (
            <div className="mb-4">
              <h3 className="h5 text-secondary mb-3">
                <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                Administrative Tools
              </h3>
              <div className="row g-4">
                {adminCards.map((card) => (
                  <DashboardCard key={card.title} {...card} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .hover-shadow {
          transition: box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out;
        }
        .hover-shadow:hover {
          box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.15) !important;
          transform: translateY(-5px);
        }
        .transition {
          transition: all 0.3s ease-in-out;
        }
      `}</style>
    </Layout>
  );
}
