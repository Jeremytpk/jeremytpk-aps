import React, { useState } from "react";
import { Apartment } from "../types";
import { Building, MapPin, Users, Bed, Check, Plus, Trash2, Edit2, X, Upload, Image as ImageIcon, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

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
  const [details, setDetails] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [formError, setFormError] = useState("");

  // Slide position tracker for each apartment layout card
  const [activeIndexes, setActiveIndexes] = useState<Record<string, number>>({});

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

  const processMultipleFiles = (files: FileList, callback: (urls: string[]) => void) => {
    const loadedUrls: string[] = [];
    let processedCount = 0;
    const fileArray = Array.from(files).filter(f => f.type.startsWith("image/"));

    if (fileArray.length === 0) return;

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === "string") {
          loadedUrls.push(event.target.result);
        }
        processedCount++;
        if (processedCount === fileArray.length) {
          callback(loadedUrls);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      processMultipleFiles(e.dataTransfer.files, (urls) => {
        setImages((prev) => [...prev, ...urls].slice(0, 10));
        setFormError("");
      });
    }
  };

  const handleDropEdit = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveEdit(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length && editingApt) {
      processMultipleFiles(e.dataTransfer.files, (urls) => {
        const oldImages = editingApt.images || [];
        setEditingApt({
          ...editingApt,
          images: [...oldImages, ...urls].slice(0, 10)
        });
        setFormError("");
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) {
      processMultipleFiles(e.target.files, (urls) => {
        setImages((prev) => [...prev, ...urls].slice(0, 10));
        setFormError("");
      });
    }
  };

  const handleFileChangeEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length && editingApt) {
      processMultipleFiles(e.target.files, (urls) => {
        const oldImages = editingApt.images || [];
        setEditingApt({
          ...editingApt,
          images: [...oldImages, ...urls].slice(0, 10)
        });
        setFormError("");
      });
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
    setDetails("");
    setImages([]);
    setNewImageUrl("");
    setFormError("");
    setDragActive(false);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) return;

    if (images.length < 3 || images.length > 10) {
      setFormError(`Validation requise : Veuillez ajouter entre 3 et 10 images pour cet hébergement (Actuellement : ${images.length} image(s)).`);
      return;
    }

    const newApt: Apartment = {
      id: "apt-" + Date.now(),
      name,
      address,
      rooms: Number(rooms),
      beds: Number(beds),
      maxGuests: Number(maxGuests),
      status,
      thumbnail: images[0],
      images: images,
      details: details.trim()
    };

    onAddApartment(newApt);
    setIsAddOpen(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApt) return;

    const editImages = editingApt.images || [];
    if (editImages.length < 3 || editImages.length > 10) {
      setFormError(`Validation requise : Veuillez insérer entre 3 et 10 images pour cet hébergement (Actuellement : ${editImages.length} image(s)).`);
      return;
    }

    // Set thumbnail to the first image automatically
    const updatedApt = {
      ...editingApt,
      thumbnail: editImages[0]
    };

    onUpdateApartment(updatedApt);
    setEditingApt(null);
    setFormError("");
  };

  const startEdit = (apt: Apartment) => {
    setEditingApt({
      ...apt,
      images: apt.images && apt.images.length >= 3 ? apt.images : [apt.thumbnail, apt.thumbnail, apt.thumbnail],
      details: apt.details || ""
    });
    setFormError("");
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
            {/* Bannière Image avec Slider */}
            <div className="relative h-48 class-image-container overflow-hidden group/slider">
              {(() => {
                const aptImages = apt.images && apt.images.length >= 3 ? apt.images : [apt.thumbnail];
                const activeIndex = activeIndexes[apt.id] || 0;
                
                const handlePrev = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setActiveIndexes(prev => ({
                    ...prev,
                    [apt.id]: (activeIndex - 1 + aptImages.length) % aptImages.length
                  }));
                };
                
                const handleNext = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setActiveIndexes(prev => ({
                    ...prev,
                    [apt.id]: (activeIndex + 1) % aptImages.length
                  }));
                };

                return (
                  <>
                    <img
                      src={aptImages[activeIndex]}
                      alt={`${apt.name} - Vue ${activeIndex + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-all duration-300"
                    />
                    
                    {/* Controles du Slider */}
                    {aptImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={handlePrev}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 cursor-pointer shadow-sm z-10"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 cursor-pointer shadow-sm z-10"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        
                        {/* Indicateurs / Bulle du nombre d'images */}
                        <div className="absolute top-3 left-3 bg-slate-900/70 backdrop-blur-md text-[10px] text-white font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>{activeIndex + 1} / {aptImages.length}</span>
                        </div>
                        
                        {/* Points de navigation en bas */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                          {aptImages.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setActiveIndexes(prev => ({ ...prev, [apt.id]: i }));
                              }}
                              className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                                i === activeIndex ? "bg-white scale-125 w-3" : "bg-white/50 hover:bg-white/80"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
              
              <div className="absolute top-3 right-3 z-10">
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
                {apt.details && (
                  <p className="text-slate-500 text-xs font-sans mt-2.5 pb-1 border-t border-slate-50 pt-2 leading-relaxed italic">
                    {apt.details}
                  </p>
                )}
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

              {/* Détails supplémentaires de l'appartement */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Description & Détails de l'Hébergement
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Superbe suite de luxe avec terrasse privée vue mer, salle de bain en marbre et équipements haut de gamme..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans resize-none"
                />
              </div>

              {/* Images de Prestige (3 à 10 images requises) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">
                    Images de l'Hébergement * (3 à 10 requises)
                  </label>
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${images.length >= 3 && images.length <= 10 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {images.length} / 10 images
                  </span>
                </div>

                {/* Grid d'aperçu des images déjà téléchargées / ajoutées */}
                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 border border-slate-100 p-2 rounded-xl bg-slate-50/50">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square group bg-slate-100 shadow-3xs">
                        <img src={img} alt={`Aperçu ${idx + 1}`} className="w-full h-full object-cover" />
                        
                        <span className="absolute bottom-1 left-1 bg-slate-900/80 text-[8px] text-white px-1.5 py-0.5 rounded font-mono z-10">
                          {idx === 0 ? "Bannière" : `#${idx + 1}`}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setImages(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-xs transition-colors cursor-pointer z-10"
                          title="Supprimer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Entrée de drag/drop ou manuel */}
                {images.length < 10 && (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("file-upload-input-multi")?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                      dragActive
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      id="file-upload-input-multi"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="w-6 h-6 mb-1 text-slate-400" />
                    <p className="text-[11px] font-medium text-slate-700 font-sans">
                      Glissez, ou <span className="text-blue-600 hover:text-blue-700 underline font-semibold">cliquez</span> pour ajouter des photos de prestige
                    </p>
                    <p className="text-[9px] text-slate-400 font-sans">
                      Vous pouvez en sélectionner plusieurs à la fois
                    </p>
                  </div>
                )}

                {/* Saisie d'images par URL individuelle */}
                {images.length < 10 && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Ajouter une image par adresse URL..."
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="flex-1 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-slate-400 font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newImageUrl.trim()) {
                          setImages(prev => [...prev, newImageUrl.trim()]);
                          setNewImageUrl("");
                          setFormError("");
                        }
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Ajouter URL
                    </button>
                  </div>
                )}
              </div>

              {/* Erreur de validation de formulaire */}
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold font-sans rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 animate-bounce" />
                  <div>{formError}</div>
                </div>
              )}

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

              {/* Détails supplémentaires de l'appartement */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                  Description & Détails de l'Hébergement
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Superbe suite de luxe avec terrasse privée..."
                  value={editingApt.details || ""}
                  onChange={(e) => setEditingApt({ ...editingApt, details: e.target.value })}
                  className="w-full text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans resize-none"
                />
              </div>

              {/* Images de Prestige (3 à 10 images requises) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">
                    Images de l'Hébergement * (3 à 10 requises)
                  </label>
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${(editingApt.images || []).length >= 3 && (editingApt.images || []).length <= 10 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {(editingApt.images || []).length} / 10 images
                  </span>
                </div>

                {/* Grid d'aperçu des images dans Edit */}
                {(editingApt.images || []).length > 0 && (
                  <div className="grid grid-cols-4 gap-2 border border-slate-100 p-2 rounded-xl bg-slate-50/50">
                    {(editingApt.images || []).map((img, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square group bg-slate-100 shadow-3xs">
                        <img src={img} alt={`Aperçu ${idx + 1}`} className="w-full h-full object-cover" />
                        
                        <span className="absolute bottom-1 left-1 bg-slate-900/80 text-[8px] text-white px-1.5 py-0.5 rounded font-mono z-10">
                          {idx === 0 ? "Bannière" : `#${idx + 1}`}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            const filteredImgs = (editingApt.images || []).filter((_, i) => i !== idx);
                            setEditingApt({ ...editingApt, images: filteredImgs });
                          }}
                          className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-xs transition-colors cursor-pointer z-10"
                          title="Supprimer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Entrée de drag/drop ou manuel dans Edit */}
                {(editingApt.images || []).length < 10 && (
                  <div
                    onDragEnter={handleDragEdit}
                    onDragOver={handleDragEdit}
                    onDragLeave={handleDragEdit}
                    onDrop={handleDropEdit}
                    onClick={() => document.getElementById("file-upload-input-edit-multi")?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                      dragActiveEdit
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      id="file-upload-input-edit-multi"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChangeEdit}
                      className="hidden"
                    />
                    <Upload className="w-6 h-6 mb-1 text-slate-400" />
                    <p className="text-[11px] font-medium text-slate-700 font-sans">
                      Glissez, ou <span className="text-blue-600 hover:text-blue-700 underline font-semibold">cliquez</span> pour ajouter des photos de prestige
                    </p>
                    <p className="text-[9px] text-slate-400 font-sans">
                      Vous pouvez en sélectionner plusieurs à la fois
                    </p>
                  </div>
                )}

                {/* Saisie d'images par URL individuelle dans Edit */}
                {(editingApt.images || []).length < 10 && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Ajouter une image par adresse URL..."
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="flex-1 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-slate-400 font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newImageUrl.trim()) {
                          const oldImgs = editingApt.images || [];
                          setEditingApt({
                            ...editingApt,
                            images: [...oldImgs, newImageUrl.trim()]
                          });
                          setNewImageUrl("");
                          setFormError("");
                        }
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Ajouter URL
                    </button>
                  </div>
                )}
              </div>

              {/* Erreur de validation de formulaire */}
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold font-sans rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 animate-bounce" />
                  <div>{formError}</div>
                </div>
              )}

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
