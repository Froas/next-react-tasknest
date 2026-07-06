/* TaskNest — interactive state layer (persistence + mutations) */
(function(){
  const KEY = "tn-state-v1";
  const D = window.TN_DATA;

  // Load any saved overrides for task status
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { taskStatus: {}, todoStatus: {}, subtaskStatus: {} }; }
    catch(_) { return { taskStatus: {}, todoStatus: {}, subtaskStatus: {} }; }
  }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

  const state = load();

  // Apply saved overrides to in-memory data on boot
  function applyOverrides() {
    D.goals.forEach(g => (g.milestones || []).forEach(m => (m.tasks || []).forEach(t => {
      if (state.taskStatus[t.id]) t.status = state.taskStatus[t.id];
      (t.todos || []).forEach(td => { if (state.todoStatus[td.id]) td.status = state.todoStatus[td.id]; });
      (t.subtasks || []).forEach(st => { if (state.subtaskStatus[st.id]) st.status = state.subtaskStatus[st.id]; });
    })));
    D.today.forEach(e => { if (state.taskStatus[e.id]) e.status = state.taskStatus[e.id]; });
  }
  applyOverrides();

  // Public mutation API — any component can call window.tnStore.toggle('task', id)
  window.tnStore = {
    toggleTask(id) {
      const next = (this._find('task', id)?.status === "finished") ? "in progress" : "finished";
      state.taskStatus[id] = next;
      save(state);
      this._mutateInMemory("task", id, next);
      this._notify();
      return next;
    },
    toggleTodo(id) {
      const cur = this._find('todo', id)?.status;
      const next = cur === "finished" ? "outstanding" : "finished";
      state.todoStatus[id] = next;
      save(state);
      this._mutateInMemory("todo", id, next);
      this._notify();
      return next;
    },
    toggleSubtask(id) {
      const cur = this._find('subtask', id)?.status;
      const next = cur === "finished" ? "outstanding" : "finished";
      state.subtaskStatus[id] = next;
      save(state);
      this._mutateInMemory("subtask", id, next);
      this._notify();
      return next;
    },
    reset() {
      localStorage.removeItem(KEY);
      location.reload();
    },
    _find(kind, id) {
      if (kind === "task") {
        for (const g of D.goals) for (const m of g.milestones || []) for (const t of m.tasks || []) if (t.id === id) return t;
        return D.today.find(e => e.id === id);
      }
      if (kind === "todo") {
        for (const g of D.goals) for (const m of g.milestones || []) for (const t of m.tasks || []) for (const td of t.todos || []) if (td.id === id) return td;
      }
      if (kind === "subtask") {
        for (const g of D.goals) for (const m of g.milestones || []) for (const t of m.tasks || []) for (const st of t.subtasks || []) if (st.id === id) return st;
      }
    },
    _mutateInMemory(kind, id, next) {
      const obj = this._find(kind, id);
      if (obj) obj.status = next;
    },
    _listeners: new Set(),
    subscribe(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); },
    _notify() { this._listeners.forEach(fn => fn()); },
  };

  // React hook — useStore() returns a ticking counter that forces re-render on any mutation
  window.useTnStore = function() {
    const [, setT] = React.useState(0);
    React.useEffect(() => window.tnStore.subscribe(() => setT(t => t + 1)), []);
  };
})();
