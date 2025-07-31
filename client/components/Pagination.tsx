import React, { useMemo } from "react";

import { interfaces } from "@reactivated";

import classNames from "classnames";

interface IPageLinkProps {
  page: number;
  isActive?: boolean;
  children: React.ReactNode;
  onNavigate: (page: number) => void;
}

function PageLink({ isActive = false, ...props }: IPageLinkProps) {
  const listItemClasses = classNames("page-item", {
    active: isActive,
  });

  const linkClasses = classNames("page-link", {
    "text-dark": !isActive,
  });

  return (
    <li className={listItemClasses}>
      <a className={linkClasses} onClick={() => props.onNavigate(props.page)}>
        {props.children}
      </a>
    </li>
  );
}

export function Pagination(props: interfaces.TPaginationData) {
  const pageNumbers = useMemo(() => {
    const startPage = Math.max(1, props.current_page - 2);
    const endPage = Math.min(props.total_pages, props.current_page + 2);

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [props.current_page, props.total_pages]);

  if (props.total_pages <= 1) {
    return null;
  }

  function navigateToPage(page: number) {
    const url = new URL(window.location.href);
    url.searchParams.set("page", page.toString());
    window.location.href = url.toString();
  }

  return (
    <div className="d-flex justify-content-center mt-4">
      <nav>
        <ul className="pagination">
          {props.has_previous && (
            <>
              <PageLink page={1} onNavigate={navigateToPage}>
                ««
              </PageLink>
              <PageLink page={props.previous_page_number} onNavigate={navigateToPage}>
                ‹
              </PageLink>
            </>
          )}

          {pageNumbers.map((page) => (
            <PageLink
              key={page}
              page={page}
              isActive={page === props.current_page}
              onNavigate={navigateToPage}
            >
              {page}
            </PageLink>
          ))}

          {props.has_next && (
            <>
              <PageLink page={props.next_page_number} onNavigate={navigateToPage}>
                ›
              </PageLink>
              <PageLink page={props.total_pages} onNavigate={navigateToPage}>
                »»
              </PageLink>
            </>
          )}
        </ul>
      </nav>
    </div>
  );
}
