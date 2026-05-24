import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const GRID_MIN_WIDTH = 190;
const GRID_ROW_HEIGHT = 196;
const LIST_ROW_HEIGHT = 84;
const OVERSCAN = 4;

export default function VirtualFileBrowser({
  items = [],
  viewMode = "grid",
  loading = false,
  hasMore = false,
  onLoadMore,
  renderItem,
  emptyState = null,
}) {
  const containerRef = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(720);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const element = containerRef.current;
    const update = () => {
      setViewportHeight(element.clientHeight || 720);
      setContainerWidth(element.clientWidth || 1200);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasMore || loading || !containerRef.current) return;
    const element = containerRef.current;
    const remaining = element.scrollHeight - (element.scrollTop + element.clientHeight);
    if (remaining < 600) onLoadMore?.();
  }, [hasMore, items.length, loading, onLoadMore]);

  const columns = viewMode === "grid"
    ? Math.max(1, Math.floor(containerWidth / GRID_MIN_WIDTH))
    : 1;

  const itemHeight = viewMode === "grid" ? GRID_ROW_HEIGHT : LIST_ROW_HEIGHT;
  const totalRows = Math.ceil(items.length / columns);
  const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - OVERSCAN);
  const visibleRows = Math.ceil(viewportHeight / itemHeight) + OVERSCAN * 2;
  const endRow = Math.min(totalRows, startRow + visibleRows);

  const visibleItems = useMemo(() => {
    if (viewMode === "grid") {
      return items.slice(startRow * columns, endRow * columns);
    }
    return items.slice(startRow, endRow);
  }, [columns, endRow, items, startRow, viewMode]);

  const paddingTop = startRow * itemHeight;
  const paddingBottom = Math.max(0, (totalRows - endRow) * itemHeight);

  const handleScroll = (event) => {
    const nextTop = event.currentTarget.scrollTop;
    setScrollTop(nextTop);

    if (!hasMore || loading) return;
    const remaining = event.currentTarget.scrollHeight - (nextTop + event.currentTarget.clientHeight);
    if (remaining < 600) onLoadMore?.();
  };

  if (!items.length && !loading) {
    return <div className="flex-1 min-h-0">{emptyState}</div>;
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1"
    >
      <div style={{ paddingTop, paddingBottom }}>
        {viewMode === "grid" ? (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {visibleItems.map((item) => renderItem(item))}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleItems.map((item) => renderItem(item))}
          </div>
        )}
      </div>

      {loading && items.length > 0 && (
        <div className="flex items-center justify-center py-5 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
    </div>
  );
}
