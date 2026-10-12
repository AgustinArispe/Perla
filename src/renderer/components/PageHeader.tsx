import { Children, createContext, isValidElement, useContext, type ReactNode } from 'react';

export const WorkspaceTabs = createContext<ReactNode>(null);
function hasPageTitle(children: ReactNode): boolean {
  return Children.toArray(children).some(
    (child) =>
      isValidElement<{ children?: ReactNode }>(child) &&
      (child.type === 'h1' || hasPageTitle(child.props.children)),
  );
}

export function PageHeading({
  children,
  className = 'page-heading',
}: {
  children: ReactNode;
  className?: string;
}) {
  const tabs = useContext(WorkspaceTabs);
  return (
    <>
      <div className={className}>{children}</div>
      {hasPageTitle(children) ? tabs : null}
    </>
  );
}

/** Shared heading rhythm; each workspace keeps its own operational actions. */
export function PageHeader({
  title,
  context,
  actions,
  className = '',
}: {
  title: string;
  context?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <PageHeading className={`page-heading ${className}`.trim()}>
      <div>
        <h1>{title}</h1>
        {context && <p>{context}</p>}
      </div>
      {actions}
    </PageHeading>
  );
}
