'use client';
export default function OpenChat({
  children,
  className = 'button',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event('facade:open-chat'))}
    >
      {children}
    </button>
  );
}
