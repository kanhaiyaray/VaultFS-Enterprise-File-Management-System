import { createContext, useCallback, useContext, useMemo, useState } from "react";
import toast from "react-hot-toast";

const ActionHistoryContext = createContext(null);

export function ActionHistoryProvider({ children }) {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const pushAction = useCallback((action) => {
    if (!action?.undo || !action?.redo) return;
    setUndoStack((prev) => [...prev.slice(-19), action]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(async () => {
    const action = undoStack[undoStack.length - 1];
    if (!action) return false;

    try {
      await action.undo();
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, action]);
      toast.success(action.undoLabel || "Action undone.");
      return true;
    } catch {
      toast.error(action.undoError || "Couldn't undo that action.");
      return false;
    }
  }, [undoStack]);

  const redo = useCallback(async () => {
    const action = redoStack[redoStack.length - 1];
    if (!action) return false;

    try {
      await action.redo();
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => [...prev.slice(-19), action]);
      toast.success(action.redoLabel || "Action redone.");
      return true;
    } catch {
      toast.error(action.redoError || "Couldn't redo that action.");
      return false;
    }
  }, [redoStack]);

  const value = useMemo(() => ({
    pushAction,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  }), [pushAction, redo, redoStack.length, undo, undoStack.length]);

  return (
    <ActionHistoryContext.Provider value={value}>
      {children}
    </ActionHistoryContext.Provider>
  );
}

export function useActionHistory() {
  const ctx = useContext(ActionHistoryContext);
  if (!ctx) throw new Error("useActionHistory must be used inside ActionHistoryProvider");
  return ctx;
}
