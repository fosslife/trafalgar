import { useState, useRef, useEffect } from "react";
import { House, CaretRight, DotsThree } from "@phosphor-icons/react";
import { sep } from "@tauri-apps/api/path";

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  const [showAllSegments, setShowAllSegments] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Split path into segments, handling both / and \ separators
  const segments = path.split(/[/\\]/).filter(Boolean);

  // Handle drive letters specially
  const isDrivePath = /^[A-Za-z]:/.test(path);
  if (isDrivePath) {
    const driveLetter = segments[0].replace(":", "");
    segments[0] = `${driveLetter}:${sep()}`;
  }

  const buildPath = (index: number) => {
    if (index === -1) return sep();
    return segments.slice(0, index + 1).join(sep());
  };

  // Setup resize observer once on mount
  useEffect(() => {
    const container = containerRef.current;
    const nav = navRef.current;

    if (container && nav) {
      resizeObserverRef.current = new ResizeObserver(() => {
        const shouldCollapse = nav.scrollWidth > container.clientWidth;
        if (shouldCollapse) {
          setShowAllSegments(false);
        }
      });

      resizeObserverRef.current.observe(container);
    }

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  // Reset expanded state when path changes
  useEffect(() => {
    setShowAllSegments(false);
  }, [path]);

  // Get visible segments based on available space
  const getVisibleSegments = () => {
    if (showAllSegments) return segments;
    if (segments.length <= 4) return segments;
    return [segments[0], "...", ...segments.slice(-2)];
  };

  const visibleSegments = getVisibleSegments();

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0 bg-white border border-surface-200 rounded-xl shadow-sm"
    >
      <nav
        ref={navRef}
        className={`flex items-center space-x-1 px-3 py-2
          ${
            showAllSegments
              ? "overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
              : "overflow-hidden"
          }`}
      >
        <button
          onClick={() => onNavigate(sep())}
          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
            path === sep()
              ? "text-primary-500 bg-surface-50"
              : "text-gray-500 hover:bg-surface-50"
          }`}
          title="Home"
        >
          <House className="w-4 h-4" />
        </button>

        {visibleSegments.length > 0 && (
          <CaretRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}

        <div className="flex items-center flex-shrink min-w-0">
          {visibleSegments.map((segment, index) => (
            <div key={index} className="flex items-center flex-shrink-0">
              {segment === "..." ? (
                <button
                  onClick={() => setShowAllSegments(true)}
                  className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:bg-white/50 flex items-center"
                  title="Show full path"
                >
                  <DotsThree className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() =>
                      onNavigate(
                        buildPath(
                          showAllSegments ? index : segments.indexOf(segment)
                        )
                      )
                    }
                    className={`px-2 py-1 rounded-lg text-sm transition-colors whitespace-nowrap ${
                      index === visibleSegments.length - 1
                        ? "text-primary-500 bg-white shadow-sm font-medium"
                        : "text-gray-600 hover:bg-white/50"
                    }`}
                  >
                    {segment}
                  </button>
                  {index < visibleSegments.length - 1 && (
                    <CaretRight className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </nav>

      {showAllSegments && (
        <button
          onClick={() => setShowAllSegments(false)}
          className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-white via-white/90 to-transparent px-3 text-gray-500 hover:text-gray-700"
          title="Collapse path"
        >
          <CaretRight className="w-4 h-4 rotate-180" />
        </button>
      )}
    </div>
  );
}
