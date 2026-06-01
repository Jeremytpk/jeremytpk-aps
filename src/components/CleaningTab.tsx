import React, { useState } from "react";
import { CleaningTask, Apartment } from "../types";
import { CheckSquare, Square, CheckCircle2, AlertCircle, Plus, Trash2, Edit, X, Calendar, User, Clock, ClipboardList } from "lucide-react";

interface CleaningTabProps {
  cleaningTasks: CleaningTask[];
  apartments: Apartment[];
  onAddCleaningTask: (task: CleaningTask) => void;
  onUpdateCleaningTask: (task: CleaningTask) => void;
  onDeleteCleaningTask: (id: string) => void;
}

export default function CleaningTab({
  cleaningTasks,
  apartments,
  onAddCleaningTask,
  onUpdateCleaningTask,
  onDeleteCleaningTask,
}: CleaningTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CleaningTask | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [apartmentFilter, setApartmentFilter] = useState<string>("all");

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add Task form states
  const [apartmentId, setApartmentId] = useState("");
  const [date, setDate] = useState("");
  const [cleanerName, setCleanerName] = useState("");
  const [notes, setNotes] = useState("");
  const [checklistItemsText, setChecklistItemsText] = useState(""); // newline-separated

  const resetForm = () => {
    setApartmentId(apartments[0]?.id || "");
    setDate("");
    setCleanerName("");
    setNotes("");
    setChecklistItemsText(
      "Retirer les draps et laver les serviettes\nDésinfecter la cuisine et le réfrigérateur\nPasser l'aspirateur et laver les sols\nRéapprovisionner les produits d'accueil et le café\nDésinfecter la salle de bain"
    );
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apartmentId || !date || !cleanerName) return;

    const items = checklistItemsText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((text, idx) => ({
        id: `c-item-${Date.now()}-${idx}`,
        text,
        done: false,
      }));

    const newTask: CleaningTask = {
      id: "clean-" + Date.now(),
      apartmentId,
      bookingId: "", // standalone check-out or routine maintenance
      date,
      status: "pending",
      cleanerName,
      notes,
      checklist: items,
    };

    onAddCleaningTask(newTask);
    setIsAddOpen(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    onUpdateCleaningTask(editingTask);
    setEditingTask(null);
  };

  const toggleChecklistItem = (task: CleaningTask, itemId: string) => {
    const updatedChecklist = task.checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );

    // If all items are checked, maybe suggest keeping status as is or updating it
    const allDone = updatedChecklist.every((i) => i.done);
    const newStatus = allDone ? "completed" : task.status === "completed" ? "in_progress" : task.status;

    onUpdateCleaningTask({
      ...task,
      checklist: updatedChecklist,
      status: newStatus,
    });
  };

  const changeStatus = (task: CleaningTask, status: "pending" | "in_progress" | "completed") => {
    // Auto check/uncheck items if setting to completed/pending
    const updatedChecklist = task.checklist.map((item) => ({
      ...item,
      done: status === "completed" ? true : status === "pending" ? false : item.done,
    }));

    onUpdateCleaningTask({
      ...task,
      status,
      checklist: updatedChecklist,
    });
  };

  const getApartmentName = (id: string) => {
    const apt = apartments.find((a) => a.id === id);
    return apt ? apt.name : "Hébergement inconnu";
  };

  const filteredTasks = cleaningTasks.filter((t) => {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesApartment = apartmentFilter === "all" || t.apartmentId === apartmentFilter;
    return matchesStatus && matchesApartment;
  });

  return (
    <div id="cleaning-tab-container" className="space-y-6">
      {/* En-tête et Bouton d'Ajout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 font-sans">
            Plannings de Nettoyage
          </h2>
          <p className="text-sm text-slate-500 font-sans mt-0.5">
            Coordonnez le personnel d'entretien, gérez les fiches de nettoyage de départ et suivez la propreté en temps réel.
          </p>
        </div>
        {apartments.length === 0 ? (
          <div className="text-xs font-semibold text-amber-600 bg-amber-50/55 px-3.5 py-2 border border-amber-100/70 rounded-xl font-sans animate-fade-in">
            ⚠️ Créez d'abord un logement pour planifier un ménage
          </div>
        ) : (
          <button
            id="btn-add-cleaning"
            onClick={() => {
              setApartmentId(apartments[0].id);
              setDate(new Date().toISOString().substring(0, 10)); // Default to today
              setIsAddOpen(true);
            }}
            className="inline-flex items-center gap-2 justify-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm cursor-pointer animate-fade-in"
          >
            <Plus className="w-4 h-4" />
            Planifier un Ménage
          </button>
        )}
      </div>

      {/* Filtres ménage */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center gap-4 font-sans text-sm">
        <div className="flex items-center gap-2 text-slate-500 flex-1">
          <ClipboardList className="w-4 h-4 text-slate-400" />
          <span>Filtres :</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            id="clean-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 focus:outline-hidden cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
          </select>

          <select
            id="clean-apartment-filter"
            value={apartmentFilter}
            onChange={(e) => setApartmentFilter(e.target.value)}
            className="text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 focus:outline-hidden cursor-pointer"
          >
            <option value="all">Tous les hébergements</option>
            {apartments.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grille des tâches de ménage */}
      <div id="cleaning-task-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTasks.map((task) => {
          const completedCount = task.checklist.filter((i) => i.done).length;
          const totalCount = task.checklist.length;
          const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

          return (
            <div
              key={task.id}
              id={`clean-card-${task.id}`}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                {/* En-tête de carte : logement, date, personnel */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 leading-tight">
                      {getApartmentName(task.apartmentId)}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{task.date}</span>
                      <span className="text-slate-300">|</span>
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{task.cleanerName}</span>
                    </div>
                  </div>

                  {/* Bouton de statut pilule */}
                  <select
                    value={task.status}
                    onChange={(e) => changeStatus(task, e.target.value as any)}
                    className={`text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-hidden cursor-pointer transition-colors ${
                      task.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : task.status === "in_progress"
                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                        : "bg-rose-50 text-rose-700 border border-slate-100"
                    }`}
                  >
                    <option value="pending">⏳ En attente</option>
                    <option value="in_progress">⚙️ En cours</option>
                    <option value="completed">✅ Terminé</option>
                  </select>
                </div>

                {/* Barre de progression */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <span>Progression des tâches</span>
                    <span>
                      {completedCount}/{totalCount} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-1.5 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Notes de consigne */}
                {task.notes && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed font-sans">
                    <span className="font-bold text-slate-700">Consignes de ménage : </span>
                    {task.notes}
                  </div>
                )}

                {/* Éléments de la check-list */}
                <div className="space-y-1.5 pt-1">
                  {task.checklist.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleChecklistItem(task, item.id)}
                      className="flex items-center gap-2.5 w-full text-left p-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-xs group"
                    >
                      {item.done ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-4.5 h-4.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0" />
                      )}
                      <span className={item.done ? "line-through text-slate-400" : ""}>{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Barre de contrôle d'édition/suppression */}
              <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-50">
                <button
                  id={`btn-edit-clean-${task.id}`}
                  onClick={() => {
                    setEditingTask({ ...task });
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs text-slate-600 hover:text-slate-950 hover:bg-slate-50 rounded-md border border-slate-100 font-sans cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Modifier personnel/notes
                </button>
                {deleteConfirmId === task.id ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 animate-pulse">
                    <span className="text-[10px] font-bold text-rose-600 font-sans">Supprimer ?</span>
                    <button
                      onClick={() => {
                        onDeleteCleaningTask(task.id);
                        setDeleteConfirmId(null);
                      }}
                      className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 transition-colors uppercase font-sans cursor-pointer"
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold hover:bg-slate-300 transition-colors uppercase font-sans cursor-pointer"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    id={`btn-delete-clean-${task.id}`}
                    onClick={() => {
                      setDeleteConfirmId(task.id);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md border border-rose-50 font-sans cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-500 font-sans">
            <ClipboardList className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="font-semibold text-lg">Aucun nettoyage planifié</p>
            <p className="text-sm mt-1">Desserrez vos filtres de recherche ou planifiez une intervention depuis la commande ci-dessus.</p>
          </div>
        )}
      </div>

      {/* Modal d'Ajout */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-slate-900 text-lg">Planifier un Nouveau Ménage</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Sélectionner l'Hébergement *
                </label>
                <select
                  required
                  value={apartmentId}
                  onChange={(e) => setApartmentId(e.target.value)}
                  className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans cursor-pointer"
                >
                  {apartments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Date d'intervention *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Nom du Technicien *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Anna Laurent"
                    value={cleanerName}
                    onChange={(e) => setCleanerName(e.target.value)}
                    className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Instructions / Codes d'accès
                </label>
                <textarea
                  placeholder="Ex : Code d'entrée 5562. Merci de bien aérer, retirer les draps et vider les poubelles."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Tâches à accomplir (Une tâche par ligne)
                </label>
                <textarea
                  required
                  placeholder="Retirer les draps et laver les serviettes"
                  value={checklistItemsText}
                  onChange={(e) => setChecklistItemsText(e.target.value)}
                  className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-hidden focus:border-slate-400 font-sans h-28"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer"
                >
                  Enregistrer la planification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'édition des notes/personnel */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-slate-900 text-lg">Modifier la Tâche de Ménage</h3>
              <button
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={editingTask.date}
                  onChange={(e) => setEditingTask({ ...editingTask, date: e.target.value })}
                  className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Assigned Cleaner
                </label>
                <input
                  type="text"
                  required
                  value={editingTask.cleanerName}
                  onChange={(e) => setEditingTask({ ...editingTask, cleanerName: e.target.value })}
                  className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Instructions / Notes
                </label>
                <textarea
                  value={editingTask.notes}
                  onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                  className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans h-24 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
