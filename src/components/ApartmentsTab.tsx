import React, { useState } from "react";
import { Apartment } from "../types";
import { Building, MapPin, Users, Bed, Check, Plus, Trash2, Edit2, X, Upload, Image as ImageIcon } from "lucide-react";

interface ApartmentsTabProps {
  apartments: Apartment[];
  onAddApartment: (apt: Apartment) => void;
  onUpdateApartment: (apt: Apartment) => void;
  onDeleteApartment: (id: string) => void;
}

export default function ApartmentsTab({
  apartments,
  onAddApartment,
  onUpdateApartment,
  onDeleteApartment,
}: ApartmentsTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Apartment | null>(null);
  const [search, setSearch] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [rooms, setRooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [maxGuests, setMaxGuests] = useState(2);
  const [status, setStatus] = useState<"free" | "occupied" | "scheduled">("free");
  const [thumbnail, setThumbnail] = useState("");

  // Drag and drop states for photo upload
  const [dragActive, setDragActive] = useState(false);
  const [dragActiveEdit, setDragActiveEdit] = useState(false);

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDragEdit = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveEdit(true);
    } else if (e.type === "dragleave") {
      setDragActiveEdit(false);
    }
  };

  const processFile = (file: File, callback: (result: string) => void) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === "string") {
          callback(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], (dataUrl) => setThumbnail(dataUrl));
    }
  };

  const handleDropEdit = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveEdit(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && editingApt) {
      processFile(e.dataTransfer.files[0], (dataUrl) =>
        setEditingApt({ ...editingApt, thumbnail: dataUrl })
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], (dataUrl) => setThumbnail(dataUrl));
    }
  };

  const handleFileChangeEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editingApt) {
      processFile(e.target.files[0], (dataUrl) =>
        setEditingApt({ ...editingApt, thumbnail: dataUrl })
      );
    }
  };

  const resetForm = () => {
    setName("");
    setAddress("");
    setRooms(1);
    setBeds(1);
    setMaxGuests(2);
    setStatus("free");
    setThumbnail("");
    setDragActive(false);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) return;

    const defaultThumbs = [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80"
    ];

    const newApt: Apartment = {
      id: "apt-" + Date.now(),
      name,
      address,
      rooms: Number(rooms),
      beds: Number(beds),
      maxGuests: Number(maxGuests),
      status,
      thumbnail: thumbnail.trim() || defaultThumbs[Math.floor(Math.random() * defaultThumbs.length)]
    };

    onAddApartment(newApt);
    setIsAddOpen(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApt) return;
    onUpdateApartment(editingApt);
    setEditingApt(null);
  };

  const startEdit = (apt: Apartment) => {
    setEditingApt({ ...apt });
  };

  const filtered = apartments.filter(
    (apt) =>
      apt.name.toLowerCase().includes(search.toLowerCase()) ||
      apt.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div id="apartments-tab-container" className="space-y-6">
      {/* En-tête et contrôles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 font-sans">
            Hébergements de SpaceOne
          </h2>
          <p className="text-sm text-slate-500 font-sans mt-1">
            Gérez votre parc immobilier, suivez le statut de disponibilité et visualisez les caractéristiques de SpaceOne.
          </p>
        </div>
        <button
          id="btn-add-apartment"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 justify-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Ajouter un Logement
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
        <Building className="text-slate-400 w-5 h-5 flex-shrink-0" />
        <input
          type="text"
          id="apartment-search"
          placeholder="Rechercher par nom ou par adresse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden w-full font-sans"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-slate-400 hover:text-slate-600 font-sans text-xs underline cursor-pointer"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Grille de cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((apt) => (
          <div
            key={apt.id}
            id={`apt-card-${apt.id}`}
            className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col group"
          >
            {/* Bannière Image */}
            <div className="relative h-48 class-image-container overflow-hidden">
              <img
                src={apt.thumbnail}
                alt={apt.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 right-3">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md shadow-xs ${
                    apt.status === "occupied"
                      ? "bg-rose-500/90 text-white"
                      : apt.status === "scheduled"
                      ? "bg-amber-500/90 text-white"
                      : "bg-emerald-500/90 text-white"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
                  {apt.status === "occupied" ? "Occupé" : apt.status === "scheduled" ? "Réservé" : "Disponible"}
                </span>
              </div>
            </div>

            {/* Informations Générales */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-800">
                  {apt.name}
                </h3>
                <div className="flex items-start gap-1.5 text-slate-500 text-xs mt-1.5 leading-normal">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" />
                  <span>{apt.address}</span>
                </div>
              </div>

              {/* Attributs de la chambre */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-50 text-xs text-slate-600 font-mono">
                <div className="flex flex-col items-center justify-center bg-slate-50 p-2 rounded-lg">
                  <Building className="w-3.5 h-3.5 text-slate-400 mb-1" />
                  <span>{apt.rooms} Pièce{apt.rooms > 1 ? "s" : ""}</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-slate-50 p-2 rounded-lg">
                  <Bed className="w-3.5 h-3.5 text-slate-400 mb-1" />
                  <span>{apt.beds} Lit{apt.beds > 1 ? "s" : ""}</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-slate-50 p-2 rounded-lg">
                  <Users className="w-3.5 h-3.5 text-slate-400 mb-1" />
                  <span>Max {apt.maxGuests} voyageurs</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  id={`btn-edit-apt-${apt.id}`}
                  onClick={() => startEdit(apt)}
                  className="p-1.5 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                  title="Modifier les attributs"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {deleteConfirmId === apt.id ? (
                  <div className="flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100 animate-pulse">
                    <span className="text-[10px] font-bold text-rose-600 font-sans">Supprimer ?</span>
                    <button
                      onClick={() => {
                        onDeleteApartment(apt.id);
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
                    id={`btn-delete-apt-${apt.id}`}
                    onClick={() => {
                      setDeleteConfirmId(apt.id);
                    }}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Supprimer ce logement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-500 font-sans">
            <Building className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="font-semibold text-lg">Aucun logement trouvé</p>
            <p className="text-sm mt-1">Essayer d'ajuster votre recherche ou ajoutez un tout nouvel hébergement SpaceOne.</p>
          </div>
        )}
      </div>

      {/* Modal d'ajout d'appartement */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-slate-900 text-lg">Ajouter un Nouvel Hébergement</h3>
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
                  Nom du Logement *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: La Suite Royale Prestige"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Adresse de Voirie *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 24 Rue de Rivoli, Paris, France"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Pièces
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={rooms}
                    onChange={(e) => setRooms(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Lits
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={beds}
                    onChange={(e) => setBeds(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Max Voyageurs
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
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
                  <option value="free">Libre (Disponible)</option>
                  <option value="occupied">Occupé</option>
                  <option value="scheduled">Réservé (Planifié)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Photo de l'Hébergement *
                </label>
                
                {thumbnail ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 h-40 bg-slate-50 group/preview flex items-center justify-center">
                    <img src={thumbnail} alt="Aperçu" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setThumbnail("")}
                      className="absolute btn-remove-img top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full p-1.5 shadow-sm transition-colors cursor-pointer"
                      title="Supprimer la photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="bg-slate-900/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium font-sans">
                        Photo de prestige chargée
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("file-upload-input")?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                      dragActive
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      id="file-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className={`w-8 h-8 mb-2 transition-colors ${dragActive ? "text-blue-500" : "text-slate-400"}`} />
                    <p className="text-xs font-medium text-slate-700 font-sans">
                      Glissez-déposez une photo de l'appartement, ou <span className="text-blue-600 hover:text-blue-700 underline font-semibold">parcourez</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-sans mt-1">
                      Formats acceptés : PNG, JPG, JPEG, WebP
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <hr className="flex-1 border-slate-100" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Ou lier par internet</span>
                <hr className="flex-1 border-slate-100" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Saisir l'adresse URL de l'image (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Laissez vide pour image de prestige aléatoire"
                  value={thumbnail.startsWith("data:") ? "" : thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
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
                  Créer le Logement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'édition d'appartement */}
      {editingApt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-slate-900 text-lg">Modifier - {editingApt.name}</h3>
              <button
                onClick={() => setEditingApt(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Nom du Logement
                </label>
                <input
                  type="text"
                  required
                  value={editingApt.name}
                  onChange={(e) => setEditingApt({ ...editingApt, name: e.target.value })}
                  className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Adresse de Voirie
                </label>
                <input
                  type="text"
                  required
                  value={editingApt.address}
                  onChange={(e) => setEditingApt({ ...editingApt, address: e.target.value })}
                  className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Pièces
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingApt.rooms}
                    onChange={(e) =>
                      setEditingApt({
                        ...editingApt,
                        rooms: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Lits
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingApt.beds}
                    onChange={(e) =>
                      setEditingApt({
                        ...editingApt,
                        beds: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                    Max Voyageurs
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingApt.maxGuests}
                    onChange={(e) =>
                      setEditingApt({
                        ...editingApt,
                        maxGuests: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Statut Actuel
                </label>
                <select
                  value={editingApt.status}
                  onChange={(e) =>
                    setEditingApt({
                      ...editingApt,
                      status: e.target.value as any,
                    })
                  }
                  className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans cursor-pointer"
                >
                  <option value="free">Libre (Disponible)</option>
                  <option value="occupied">Occupé</option>
                  <option value="scheduled">Réservé (Planifié)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Photo de l'Hébergement *
                </label>
                
                {editingApt.thumbnail ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 h-40 bg-slate-50 group/preview flex items-center justify-center">
                    <img src={editingApt.thumbnail} alt="Aperçu" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditingApt({ ...editingApt, thumbnail: "" })}
                      className="absolute btn-remove-img top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full p-1.5 shadow-sm transition-colors cursor-pointer"
                      title="Supprimer la photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="bg-slate-900/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium font-sans">
                        Photo de prestige chargée
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDragEdit}
                    onDragOver={handleDragEdit}
                    onDragLeave={handleDragEdit}
                    onDrop={handleDropEdit}
                    onClick={() => document.getElementById("file-upload-input-edit")?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                      dragActiveEdit
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      id="file-upload-input-edit"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChangeEdit}
                      className="hidden"
                    />
                    <Upload className={`w-8 h-8 mb-2 transition-colors ${dragActiveEdit ? "text-blue-500" : "text-slate-400"}`} />
                    <p className="text-xs font-medium text-slate-700 font-sans">
                      Glissez-déposez une nouvelle photo pour cet hébergement, ou <span className="text-blue-600 hover:text-blue-700 underline font-semibold">parcourez</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-sans mt-1">
                      Formats acceptés : PNG, JPG, JPEG, WebP
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <hr className="flex-1 border-slate-100" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Ou lier par internet</span>
                <hr className="flex-1 border-slate-100" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Saisir l'adresse URL de l'image (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Inscrivez une adresse URL valide"
                  value={editingApt.thumbnail.startsWith("data:") ? "" : editingApt.thumbnail}
                  onChange={(e) => setEditingApt({ ...editingApt, thumbnail: e.target.value })}
                  className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingApt(null)}
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
