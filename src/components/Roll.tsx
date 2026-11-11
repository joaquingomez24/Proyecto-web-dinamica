/** Text that rolls to a duplicate of itself on hover (used inside .btn). */
export function Roll({ children }: { children: string }) {
  return (
    <span className="btn__roll">
      <span data-text={children}>{children}</span>
    </span>
  );
}
