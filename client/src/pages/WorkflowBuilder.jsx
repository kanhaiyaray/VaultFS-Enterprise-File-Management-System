import { useState, useRef } from "react";
import api from "../utils/api";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const ItemType = { ACTION: "ACTION" };

function DraggableAction({ a, idx, moveAction, updateAction, remove, actionsLength }) {
  const ref = useRef(null);
  const [, drop] = useDrop({
    accept: ItemType.ACTION,
    hover(item) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = idx;
      if (dragIndex === hoverIndex) return;
      moveAction(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });
  const [{ isDragging }, drag] = useDrag({
    type: ItemType.ACTION,
    item: { index: idx },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.4 : 1 }} className="border p-3 mb-2 rounded-lg">
      <div className="flex items-center justify-between">
        <strong>{a.label || a.type} ({a.type})</strong>
        <div>
          <button onClick={() => idx > 0 && moveAction(idx, idx - 1)} disabled={idx === 0} className="mr-1">▲</button>
          <button onClick={() => idx < actionsLength - 1 && moveAction(idx, idx + 1)} disabled={idx === actionsLength - 1} className="mr-1">▼</button>
          <button onClick={() => remove(idx)} className="text-red-600">Remove</button>
        </div>
      </div>
      <div className="mt-2">
        <label className="block">Label</label>
        <input value={a.label} onChange={(e) => updateAction(idx, { label: e.target.value })} className="w-full p-1 border rounded" />
      </div>
      <div className="mt-2">
        <label className="block">Params (JSON)</label>
        <textarea value={JSON.stringify(a.params || {}, null, 2)} onChange={(e) => {
          try { updateAction(idx, { params: JSON.parse(e.target.value) }); } catch { }
        }} rows={6} className="w-full p-1 border font-mono rounded" />
      </div>
    </div>
  );
}

export default function WorkflowBuilder() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("file_event");
  const [triggerEvent, setTriggerEvent] = useState("upload");
  const [scheduleType, setScheduleType] = useState("daily");
  const [scheduleTime, setScheduleTime] = useState("00:00");
  const [webhookPath, setWebhookPath] = useState("");
  const [actions, setActions] = useState([]);
  const [saving, setSaving] = useState(false);

  const addAction = (type) => setActions((s) => [...s, { type, label: type, params: {} }]);
  const updateAction = (idx, update) => setActions((s) => s.map((a, i) => i === idx ? { ...a, ...update } : a));
  const moveAction = (from, to) => setActions((s) => {
    const arr = [...s];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    return arr;
  });
  const remove = (idx) => setActions((s) => s.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        isActive: true,
        trigger: (triggerType === "file_event") ? { type: "file_event", event: triggerEvent }
          : (triggerType === "time") ? { type: "time", scheduleType, scheduleTime }
            : { type: "webhook", webhookPath },
        actions,
      };
      const res = await api.post("/api/workflows", payload);
      alert("Workflow created: " + res.data.workflow._id);
      // reset
      setName(""); setDescription(""); setActions([]);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Workflow Builder (Admin)</h2>

      <div className="mb-4">
        <label className="block">Name</label>
        <input className="w-full p-2 border rounded" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="mb-4">
        <label className="block">Description</label>
        <input className="w-full p-2 border rounded" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="mb-4">
        <label className="block">Trigger Type</label>
        <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="p-2 border rounded">
          <option value="file_event">File Event</option>
          <option value="time">Time Schedule</option>
          <option value="webhook">Webhook</option>
        </select>
      </div>

      {triggerType === "file_event" && (
        <div className="mb-4">
          <label className="block">Event</label>
          <select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className="p-2 border rounded">
            <option value="upload">upload</option>
            <option value="delete">delete</option>
            <option value="share">share</option>
            <option value="metadata_update">metadata_update</option>
            <option value="any">any</option>
          </select>
        </div>
      )}

      {triggerType === "time" && (
        <div className="mb-4">
          <label className="block">Schedule Type</label>
          <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)} className="p-2 border mb-2 rounded">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <label className="block">Time (HH:MM)</label>
          <input value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="p-2 border rounded" />
        </div>
      )}

      {triggerType === "webhook" && (
        <div className="mb-4">
          <label className="block">Webhook Path (unique)</label>
          <input value={webhookPath} onChange={(e) => setWebhookPath(e.target.value)} className="p-2 border rounded" />
        </div>
      )}

      <div className="mb-4">
        <h3 className="font-semibold mb-2">Actions</h3>
        <div className="flex gap-2 mb-2">
          <button onClick={() => addAction('notify')} className="px-3 py-1 border rounded">Add Notify</button>
          <button onClick={() => addAction('delete')} className="px-3 py-1 border rounded">Add Delete</button>
          <button onClick={() => addAction('backup')} className="px-3 py-1 border rounded">Add Backup</button>
          <button onClick={() => addAction('report')} className="px-3 py-1 border rounded">Add Report</button>
          <button onClick={() => addAction('approval')} className="px-3 py-1 border rounded">Add Approval</button>
          <button onClick={() => addAction('branch')} className="px-3 py-1 border rounded">Add Branch</button>
        </div>

        <DndProvider backend={HTML5Backend}>
          {actions.map((a, idx) => (
            <DraggableAction key={idx} a={a} idx={idx} moveAction={moveAction} updateAction={updateAction} remove={remove} actionsLength={actions.length} />
          ))}
        </DndProvider>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="px-4 py-2 bg-brand text-white rounded">{saving ? 'Saving...' : 'Save Workflow'}</button>
      </div>
    </div>
  );
}
