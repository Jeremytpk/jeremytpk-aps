import React, { useState } from "react";
import { Booking, Apartment } from "../types";
import { Calendar, User, Mail, Phone, DollarSign, Plus, Trash2, Edit3, Filter, Tag, X, CalendarDays } from "lucide-react";

interface BookingsTabProps {
  bookings: Booking[];
  apartments: Apartment[];
  onAddBooking: (booking: Booking) => void;
  onUpdateBooking: (booking: Booking) => void;
  onDeleteBooking: (id: string) => void;
}

export default function BookingsTab({
  bookings,
  apartments,
  onAddBooking,
  onUpdateBooking,
  onDeleteBooking,
}: BookingsTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [apartmentFilter, setApartmentFilter] = useState<string>("all");

  // Add booking states
  const [apartmentId, setApartmentId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);
  const [totalAmount, setTotalAmount] = useState(150);
  const [status, setStatus] = useState<"upcoming" | "active" | "completed" | "cancelled">("upcoming");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setApartmentId(apartments[0]?.id || "");
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setCheckIn("");
    setCheckOut("");
    setGuestsCount(1);
    setTotalAmount(150);
    setStatus("upcoming");
    setNotes("");
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apartmentId || !guestName || !checkIn || !checkOut) return;

    const newBooking: Booking = {
      id: "book-" + Date.now(),
      apartmentId,
      guestName,
      guestEmail: guestEmail.trim() || `${guestName.toLowerCase().replace(/\s+/g, "")}@example.com`,
      guestPhone: guestPhone.trim() || "+1 (555) 000-0000",
      checkIn,
      checkOut,
      guestsCount: Number(guestsCount),
      totalAmount: Number(totalAmount),
      status,
      notes,
    };

    onAddBooking(newBooking);
    setIsAddOpen(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    onUpdateBooking(editingBooking);
    setEditingBooking(null);
  };

  const startEdit = (booking: Booking) => {
    setEditingBooking({ ...booking });
  };

  const getApartmentName = (id: string) => {
    const apt = apartments.find((a) => a.id === id);
    return apt ? apt.name : "Unknown Apartment";
  };

  // Filters
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.guestName.toLowerCase().includes(search.toLowerCase()) ||
      b.guestEmail.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesApartment = apartmentFilter === "all" || b.apartmentId === apartmentFilter;

    return matchesSearch && matchesStatus && matchesApartment;
  });

  return (
    <div id="bookings-tab-container" className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 font-sans">
            Réservations Voyageurs
          </h2>
          <p className="text-sm text-slate-500 font-sans mt-0.5">
            Enregistrez les séjours, planifiez les arrivées, gérez la facturation et suivez les statuts de l'Auberge.
          </p>
        </div>
        <button
          id="btn-add-booking"
          onClick={() => {
            if (apartments.length === 0) {
              alert("Veuillez d'abord ajouter au moins un hébergement !");
              return;
            }
            setApartmentId(apartments[0].id);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-2 justify-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Réservation
        </button>
      </div>

      {/* Options de filtrage */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Recherche */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 col-span-1 md:col-span-2">
          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            id="booking-search"
            placeholder="Rechercher par voyageur, e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden w-full font-sans"
          />
        </div>

        {/* Filtrer par statut */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-sm text-slate-800 focus:outline-hidden w-full font-sans cursor-pointer"
          >
            <option value="all">Tous les statuts de séjour</option>
            <option value="upcoming">À venir</option>
            <option value="active">En cours</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>

        {/* Filtrer par hébergement */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          <Tag className="w-4 h-4 text-slate-400" />
          <select
            id="apartment-filter"
            value={apartmentFilter}
            onChange={(e) => setApartmentFilter(e.target.value)}
            className="bg-transparent text-sm text-slate-800 focus:outline-hidden w-full font-sans cursor-pointer"
          >
            <option value="all">Tous les hébergements</option>
            {apartments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des Réservations */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">
                <th className="px-5 py-4 min-w-[200px]">Voyageur & Contacts</th>
                <th className="px-5 py-4 min-w-[180px]">Hébergement</th>
                <th className="px-5 py-4 min-w-[180px]">Dates du séjour</th>
                <th className="px-5 py-4 text-center">Montant</th>
                <th className="px-5 py-4 text-center">Statut</th>
                <th className="px-5 py-4 text-center min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-sans text-slate-800">
              {filteredBookings.map((b) => (
                <tr key={b.id} id={`booking-row-${b.id}`} className="hover:bg-slate-50/50 transition-colors">
                  {/* Voyageur */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{b.guestName}</span>
                      <span className="text-slate-400 text-xs flex items-center gap-1 mt-1 font-mono">
                        <Mail className="w-3 h-3 text-slate-300" /> {b.guestEmail}
                      </span>
                      <span className="text-slate-400 text-xs flex items-center gap-1 mt-0.5 font-mono">
                        <Phone className="w-3 h-3 text-slate-300" /> {b.guestPhone}
                      </span>
                    </div>
                  </td>

                  {/* Logement */}
                  <td className="px-5 py-4 text-slate-600 font-medium">
                    {getApartmentName(b.apartmentId)}
                  </td>

                  {/* Dates */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1 text-slate-800 text-xs font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {b.checkIn} → {b.checkOut}
                      </span>
                      {b.notes && (
                        <span className="text-slate-400 text-xs mt-1 italic max-w-[200px] truncate" title={b.notes}>
                          "{b.notes}"
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Facture */}
                  <td className="px-5 py-4 text-center font-mono font-semibold text-slate-900">
                    {b.totalAmount} €
                  </td>

                  {/* Badge de statut */}
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        b.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : b.status === "upcoming"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : b.status === "completed"
                          ? "bg-slate-100 text-slate-700 border border-slate-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          b.status === "active"
                            ? "bg-emerald-500"
                            : b.status === "upcoming"
                            ? "bg-amber-500"
                            : b.status === "completed"
                            ? "bg-slate-400"
                            : "bg-rose-500"
                        }`}
                      />
                      {b.status === "active" ? "En cours" : b.status === "upcoming" ? "À venir" : b.status === "completed" ? "Terminée" : "Annulée"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        id={`btn-edit-booking-${b.id}`}
                        onClick={() => startEdit(b)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Modifier le séjour"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-booking-${b.id}`}
                        onClick={() => {
                          if (window.confirm(`Êtes-vous certain de vouloir supprimer la réservation de ${b.guestName} ? Les historiques de messagerie et de nettoyage liés seront conservés.`)) {
                            onDeleteBooking(b.id);
                          }
                        }}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Supprimer la réservation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-12 text-slate-500">
                    <CalendarDays className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="font-semibold text-lg">Aucune réservation trouvée</p>
                    <p className="text-sm mt-1">Modifiez vos paramètres de filtrage ou enregistrez une nouvelle réservation pour commencer.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'Ajout de Réservation */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-lg">Saisir une Nouvelle Réservation</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {/* Choix du logement */}
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
                      {apt.name} (Max {apt.maxGuests} voyageurs)
                    </option>
                  ))}
                </select>
              </div>

              {/* Fiche Voyageur */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Profil du Voyageur
                </h4>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Nom complet du voyageur *"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    placeholder="E-mail (Optionnel)"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                  />
                  <input
                    type="text"
                    placeholder="Téléphone (Optionnel)"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                  />
                </div>
              </div>

              {/* Dates de séjour */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Date d'Arrivée (Check-In) *
                  </label>
                  <input
                    type="date"
                    required
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Date de Départ (Check-Out) *
                  </label>
                  <input
                    type="date"
                    required
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
              </div>

              {/* Caractéristiques & Montant */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Nombre Voyageurs
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Total Séjour (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Statut Initial
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans cursor-pointer"
                  >
                    <option value="upcoming">À venir</option>
                    <option value="active">En cours</option>
                    <option value="completed">Terminée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Notes de Séjour / Consignes de Ménage d'Entrée
                </label>
                <textarea
                  placeholder="Ex: Demande de serviettes supplémentaires, lit bébé, livret imprimé..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans h-20 resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
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
                  Confirmer le Séjour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'édition de séjour */}
      {editingBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-lg">Modifier la Réservation</h3>
              <button
                onClick={() => setEditingBooking(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {/* Choix du logement */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Hébergement d'APS
                </label>
                <select
                  value={editingBooking.apartmentId}
                  onChange={(e) => setEditingBooking({ ...editingBooking, apartmentId: e.target.value })}
                  className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans cursor-pointer"
                >
                  {apartments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fiche Voyageur */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Profil du Voyageur
                </h4>
                <div>
                  <input
                    type="text"
                    required
                    value={editingBooking.guestName}
                    onChange={(e) => setEditingBooking({ ...editingBooking, guestName: e.target.value })}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    value={editingBooking.guestEmail}
                    onChange={(e) => setEditingBooking({ ...editingBooking, guestEmail: e.target.value })}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                  />
                  <input
                    type="text"
                    value={editingBooking.guestPhone}
                    onChange={(e) => setEditingBooking({ ...editingBooking, guestPhone: e.target.value })}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Date d'Arrivée
                  </label>
                  <input
                    type="date"
                    required
                    value={editingBooking.checkIn}
                    onChange={(e) => setEditingBooking({ ...editingBooking, checkIn: e.target.value })}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Date de Départ
                  </label>
                  <input
                    type="date"
                    required
                    value={editingBooking.checkOut}
                    onChange={(e) => setEditingBooking({ ...editingBooking, checkOut: e.target.value })}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
              </div>

              {/* Caractéristiques */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Nombre Voyageurs
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingBooking.guestsCount}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        guestsCount: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Montant Séjour (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingBooking.totalAmount}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        totalAmount: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Statut du Séjour
                  </label>
                  <select
                    value={editingBooking.status}
                    onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value as any })}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans cursor-pointer"
                  >
                    <option value="upcoming">À venir</option>
                    <option value="active">En cours</option>
                    <option value="completed">Terminée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Notes / Consignes
                </label>
                <textarea
                  value={editingBooking.notes || ""}
                  onChange={(e) => setEditingBooking({ ...editingBooking, notes: e.target.value })}
                  className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans h-20 resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
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
