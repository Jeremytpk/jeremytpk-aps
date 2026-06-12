import React, { useState, useEffect } from "react";
import { Apartment, Booking, HomeOwner } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { 
  Building, 
  Sparkles, 
  MapPin, 
  Bed, 
  DoorClosed, 
  Users, 
  CalendarDays, 
  Clock, 
  Mail, 
  Phone, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Layers, 
  Copy, 
  ChevronRight,
  DollarSign
} from "lucide-react";

interface PublicCatalogProps {
  spaceId: string;
  owner: HomeOwner;
  apartments: Apartment[];
  onBookingSuccess: () => void;
}

export default function PublicCatalog({
  spaceId,
  owner,
  apartments,
  onBookingSuccess
}: PublicCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  
  // Booking Form State
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);
  const [notes, setNotes] = useState("");

  // Status handlers
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successBookingId, setSuccessBookingId] = useState("");

  // Search filter
  const filteredApts = apartments.filter(apt => 
    apt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic price calculation
  const getDaysDiff = (start: string, end: string) => {
    if (!start || !end) return 0;
    const sDate = new Date(start);
    const eDate = new Date(end);
    const timeDiff = eDate.getTime() - sDate.getTime();
    if (timeDiff <= 0) return 0;
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const nights = getDaysDiff(checkIn, checkOut);
  const pricePerNight = selectedApartment 
    ? 120 + (selectedApartment.rooms * 40) + (selectedApartment.maxGuests * 20)
    : 150;
  const totalAmount = nights * pricePerNight;

  // Validation of overlapping bookings
  const checkOverlapping = async (aptId: string, start: string, end: string) => {
    const q = query(
      collection(db, "bookings"),
      where("apartmentId", "==", aptId)
    );
    const snap = await getDocs(q);
    let isOverlap = false;
    snap.forEach((doc) => {
      const b = doc.data();
      if (b.status !== "cancelled") {
        if (start < b.checkOut && end > b.checkIn) {
          isOverlap = true;
        }
      }
    });
    return isOverlap;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartment) return;

    setSubmitting(true);
    setErrorMsg("");

    // Date validations
    const todayStr = new Date().toISOString().split("T")[0];
    if (checkIn < todayStr) {
      setErrorMsg("La date d'arrivée ne peut pas être dans le passé.");
      setSubmitting(false);
      return;
    }
    if (checkOut <= checkIn) {
      setErrorMsg("La date de départ doit être strictement supérieure à l'arrivée.");
      setSubmitting(false);
      return;
    }
    if (guestsCount > selectedApartment.maxGuests) {
      setErrorMsg(`Ce logement accepte un maximum de ${selectedApartment.maxGuests} voyageurs.`);
      setSubmitting(false);
      return;
    }

    try {
      // Synchronous overlap checks directly on live database
      const hasOverlap = await checkOverlapping(selectedApartment.id, checkIn, checkOut);
      if (hasOverlap) {
        setErrorMsg("Ces dates de séjour ne sont plus disponibles. Veuillez choisir d'autres dates.");
        setSubmitting(false);
        return;
      }

      const bookingId = "book-cust-" + Date.now();
      const pathBookings = "bookings";

      // 1. Write booking to database
      const bookingDocRef = await addDoc(collection(db, pathBookings), {
        apartmentId: selectedApartment.id,
        ownerId: spaceId,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
        checkIn,
        checkOut,
        guestsCount: Number(guestsCount),
        totalAmount: Number(totalAmount),
        status: "upcoming", // automatically placed as future booking
        notes: notes.trim(),
      });

      // 2. Start communication thread synchronously to match space owner interface
      const threadPath = "threads";
      await addDoc(collection(db, threadPath), {
        bookingId: bookingDocRef.id,
        guestName: guestName.trim(),
        apartmentName: selectedApartment.name,
        lastUpdated: new Date().toISOString(),
        ownerId: spaceId,
        messages: [
          {
            id: `msg-${Date.now()}-1`,
            sender: "guest",
            text: `Bonjour, je viens de finaliser ma réservation pour ${selectedApartment.name} du ${checkIn} au ${checkOut}. (${nights} nuits, ${guestsCount} voyageurs). ${notes ? `Note spéciale : "${notes}"` : ""}`,
            timestamp: new Date().toISOString(),
          },
          {
            id: `msg-${Date.now()}-2`,
            sender: "host",
            text: `Bonjour ${guestName.trim()}, nous vous remercions d'avoir choisi nos prestations de prestige. Votre demande a été enregistrée avec succès. Notre équipe de conciergerie unifiée prendra contact avec vous dans les plus brefs délais !`,
            timestamp: new Date().toISOString(),
          }
        ],
      });

      setSuccessBookingId(bookingDocRef.id);
      setSuccess(true);
      onBookingSuccess();
    } catch (err: any) {
      console.error("Booking submission error:", err);
      setErrorMsg("Une erreur technique s'est produite lors de l'enregistrement de la réservation.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedApartment(null);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setCheckIn("");
    setCheckOut("");
    setGuestsCount(1);
    setNotes("");
    setSuccess(false);
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative">
      <div>
        {/* Soft luxury glow background effects */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-sky-50 to-indigo-50/20 -z-10 pointer-events-none" />
        
        {/* Navigation / Header */}
        <header className="px-6 py-5 max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-md relative overflow-hidden shrink-0">
              <Layers className="w-5 h-5 text-white" />
              <Sparkles className="w-2.5 h-2.5 text-blue-400 absolute -top-0.5 -right-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-wider text-slate-800 font-mono">
                  {owner.businessName.toUpperCase()}
                </span>
                <span className="text-[9px] font-black tracking-wide text-blue-700 bg-blue-50 border border-blue-100/50 px-1.5 py-0.5 rounded-md font-mono uppercase">
                  Privé
                </span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 font-sans uppercase tracking-widest mt-0.5">
                Service Conciergerie • Gérant : {owner.fullName}
              </p>
            </div>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-2">
            <div className="px-3 py-1 bg-teal-50 border border-teal-100/60 text-teal-700 text-[10px] font-bold tracking-wider uppercase rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              Réservation Directe Sécurisée
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-10">
          
          {/* Welcome Intro Banner */}
          <div className="mb-12 text-center md:text-left md:flex md:items-center md:justify-between bg-slate-900 text-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-800 relative overflow-hidden min-h-[180px]">
            <div className="absolute inset-0 bg-cover bg-center opacity-10 select-none pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80')` }} />
            <div className="absolute top-[20%] right-10 w-64 h-64 bg-slate-100/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 space-y-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-300 text-[9px] font-black uppercase tracking-widest font-mono">
                <Sparkles className="w-3 h-3 text-blue-400" />
                Demeures & Appartements Prestige
              </span>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight font-sans leading-none">
                Réservez votre prochain séjour
              </h1>
              <p className="text-xs md:text-sm text-slate-300 font-sans leading-relaxed">
                Parcourez nos hébergements haut de gamme d'exception gérés par la conciergerie <strong className="text-white">{owner.businessName}</strong>. Trouvez le lieu idéal pour vos vacances ou votre déplacement professionnel et réservez immédiatement en toute autonomie.
              </p>
            </div>
            
            <div className="mt-6 md:mt-0 relative z-10 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-5 shrink-0 flex items-center gap-3">
              {owner.avatarUrl ? (
                <img
                  src={owner.avatarUrl}
                  alt={owner.fullName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shadow-md shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-sm border-2 border-white/15 shrink-0">
                  {owner.fullName.substring(0,2).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-sans">Votre Hôte Dédié</div>
                <div className="text-sm font-bold text-white font-sans">{owner.fullName}</div>
                <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> En ligne
                </div>
              </div>
            </div>
          </div>

          {!selectedApartment ? (
            <div className="space-y-8 animate-fade-in">
              {/* Filter and counts bar */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-sm font-bold text-slate-700 font-sans">
                  {filteredApts.length} {filteredApts.length > 1 ? "appartements disponibles" : "appartement disponible"}
                </div>
                
                <div className="relative max-w-sm w-full">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer par nom ou adresse de prestige..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-sans text-slate-850 placeholder-slate-40s focus:outline-none focus:border-slate-350"
                  />
                </div>
              </div>

              {/* Apartments grid list */}
              {filteredApts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/60 p-8 space-y-3">
                  <Building className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
                  <h3 className="text-base font-bold text-slate-700 font-sans">Aucun hébergement trouvé</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto font-sans leading-relaxed">
                    Nous n'avons trouvé aucun logement correspondant à vos critères de recherche pour le moment.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6.5">
                  {filteredApts.map((apt) => {
                    const roomPrice = 120 + (apt.rooms * 40) + (apt.maxGuests * 20);
                    return (
                      <div 
                        key={apt.id}
                        className="bg-white border border-slate-205/85 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
                      >
                        <div>
                          {/* Image Box */}
                          <div className="aspect-[16/10] relative overflow-hidden bg-slate-100">
                            <img
                              src={apt.thumbnail || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=640&q=80"}
                              alt={apt.name}
                              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            
                            {/* Premium pill */}
                            <div className="absolute top-3.5 left-3.5 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-wider text-white border border-white/10 flex items-center gap-1 font-mono">
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              Prestige Class
                            </div>

                            {/* Status and price pill */}
                            <div className="absolute bottom-3.5 right-3.5 px-3 py-1.5 bg-white/95 backdrop-blur-md text-slate-900 rounded-xl font-sans font-bold shadow-md text-xs border border-white">
                              À partir de <span className="font-extrabold text-blue-700 text-sm">{roomPrice} €</span> <span className="text-[10px] text-slate-500 font-medium font-sans">/ nuit</span>
                            </div>
                          </div>

                          {/* Content block */}
                          <div className="p-5.5 space-y-4 text-left">
                            <div className="space-y-1.5">
                              <h3 className="text-base font-extrabold text-slate-850 font-sans tracking-tight group-hover:text-blue-600 transition-colors leading-tight">
                                {apt.name}
                              </h3>
                              
                              <p className="text-xs text-slate-400 flex items-center gap-1 font-sans font-medium">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span className="truncate">{apt.address}</span>
                              </p>
                            </div>

                            {/* Specifications */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 font-mono text-[10px] font-bold text-slate-500 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-slate-400 text-[8px] uppercase font-sans font-bold">Pièces</span>
                                <div className="flex items-center gap-1 mt-0.5 text-slate-750 font-extrabold">
                                  <DoorClosed className="w-3 h-3 text-slate-400" />
                                  <span>{apt.rooms}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-center border-x border-slate-200">
                                <span className="text-slate-400 text-[8px] uppercase font-sans font-bold">Lits</span>
                                <div className="flex items-center gap-1 mt-0.5 text-slate-750 font-extrabold">
                                  <Bed className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{apt.beds}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-slate-400 text-[8px] uppercase font-sans font-bold">Max</span>
                                <div className="flex items-center gap-1 mt-0.5 text-slate-750 font-extrabold">
                                  <Users className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{apt.maxGuests} pers</span>
                                </div>
                              </div>
                            </div>

                            {/* Description text */}
                            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed font-sans">
                              {apt.details || "Séjour prestigieux dans une demeure d'exception dotée de prestations de confort haut de gamme. Géré et préparé méticuleusement avant chaque arrivée par la conciergerie professionnelle administrative SpaceOne."}
                            </p>
                          </div>
                        </div>

                        {/* Card footer CTA */}
                        <div className="p-5.5 pt-0">
                          <button
                            type="button"
                            onClick={() => setSelectedApartment(apt)}
                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs border border-slate-950 active:scale-[98%]"
                          >
                            <span>Réserver ce logement</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-left">
              
              {/* BACK BTN */}
              <div className="lg:col-span-12 mb-2">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  ← Retour au Catalogue
                </button>
              </div>

              {/* Left Column: Apartment Detail Card */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-md">
                  <div className="aspect-[16/10] bg-slate-100 relative">
                    <img
                      src={selectedApartment.thumbnail || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=640&q=80"}
                      alt={selectedApartment.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3.5 left-3.5 px-2.5 py-1 bg-blue-600 rounded-lg text-[9px] font-black uppercase tracking-wider text-white border border-blue-500 shadow-sm font-mono">
                      Logement Sélectionné
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="space-y-2">
                      <h2 className="text-lg font-extrabold text-slate-850 font-sans tracking-tight leading-tight">
                        {selectedApartment.name}
                      </h2>
                      <p className="text-xs text-slate-400 flex items-center gap-1 font-sans">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{selectedApartment.address}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-[10px] font-bold text-slate-500 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-slate-400 text-[8px] uppercase font-sans">Pièces</span>
                        <span className="text-slate-750 font-extrabold text-xs mt-0.5">{selectedApartment.rooms}</span>
                      </div>
                      <div className="flex flex-col items-center border-x border-slate-200">
                        <span className="text-slate-400 text-[8px] uppercase font-sans">Lits</span>
                        <span className="text-slate-750 font-extrabold text-xs mt-0.5">{selectedApartment.beds}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-slate-400 text-[8px] uppercase font-sans">Max Voyageurs</span>
                        <span className="text-slate-750 font-extrabold text-xs mt-0.5">{selectedApartment.maxGuests} pers</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-sans">Description :</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans">
                        {selectedApartment.details || "Cette propriété prestigieuse propose des espaces spacieux et harmonieusement agencés pour une expérience d'habitation haut de gamme absolue. Les draps raffinés, serviettes de bain douces, connexion Wi-Fi haut débit de conciergerie de haute technologie et kits d'accueil complets sont fournis."}
                      </p>
                    </div>

                    <hr className="border-slate-100" />

                    <div className="p-4 bg-blue-50/50 border border-blue-100/60 rounded-xl space-y-1">
                      <div className="text-[10px] text-blue-500 font-black uppercase tracking-wider font-sans">Services de Conciergerie Associés</div>
                      <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                        ✓ Assistance messagerie et concierge réactif H24 • ✓ Nettoyage et blanchisserie professionnelle avant l'arrivée • ✓ Arrivée autonome fluide simplifiée.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Booking Form and Success Layout */}
              <div className="lg:col-span-7">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-md">
                  
                  {success ? (
                    <div className="text-center py-8 space-y-5 animate-fade-in">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-lg md:text-xl font-black font-sans text-slate-800 uppercase tracking-tight">
                          Réservation Enregistrée !
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans leading-relaxed">
                          Félicitations ! Votre demande de séjour de prestige a été validée et enregistrée en temps réel dans l'espace de <strong className="text-slate-800">{owner.businessName}</strong>.
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 max-w-sm mx-auto text-left font-mono text-[11px] space-y-2 text-slate-650">
                        <div>
                          <strong className="text-slate-800">Dossier :</strong> {successBookingId}
                        </div>
                        <div>
                          <strong className="text-slate-800">Séjour :</strong> du {checkIn} au {checkOut} ({nights} nuits)
                        </div>
                        <div>
                          <strong className="text-slate-800">Logement :</strong> {selectedApartment.name}
                        </div>
                        <div>
                          <strong className="text-slate-800">Montant :</strong> {totalAmount} €
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 font-sans max-w-xs mx-auto leading-relaxed">
                        Aucun compte requis. Le gérant {owner.fullName} a été notifié instantanément et prendra contact avec vous par Email ou Téléphone.
                      </p>

                      <div className="pt-4 flex justify-center gap-3">
                        <button
                          onClick={resetForm}
                          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          Retour au Catalogue
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleBookingSubmit} className="space-y-6">
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-base font-black text-slate-800 font-sans uppercase">
                          Finalisez votre demande de réservation
                        </h3>
                        <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                          Aucun frais immédiat. Saisissez vos détails pour bloquer les dates et notifier le gérant.
                        </p>
                      </div>

                      {errorMsg && (
                        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-semibold font-sans flex items-start gap-2.5 animate-pulse">
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <div>{errorMsg}</div>
                        </div>
                      )}

                      {/* Client Info Grid */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-450 font-sans flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                          Étape 1 : Vos Coordonnées Voyageur
                        </h4>

                        <div className="space-y-3.5">
                          <div className="text-left space-y-1">
                            <label className="text-[9px] font-black text-slate-450 uppercase tracking-widest font-sans">
                              Nom complet de réservation *
                            </label>
                            <input
                              type="text"
                              required
                              value={guestName}
                              onChange={(e) => setGuestName(e.target.value)}
                              placeholder="ex: Jean de La Fontaine"
                              className="w-full bg-slate-50/50 border border-slate-205 focus:border-slate-400 rounded-xl py-2 px-3 text-xs font-sans text-slate-800 outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div className="text-left space-y-1">
                              <label className="text-[9px] font-black text-slate-455 uppercase tracking-widest font-sans">
                                Adresse Email *
                              </label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                  type="email"
                                  required
                                  value={guestEmail}
                                  onChange={(e) => setGuestEmail(e.target.value)}
                                  placeholder="ex: jean.fontaine@client.com"
                                  className="w-full bg-slate-50/50 border border-slate-205 focus:border-slate-400 rounded-xl py-2 pl-9 pr-3 text-xs font-sans text-slate-800 outline-none"
                                />
                              </div>
                            </div>

                            <div className="text-left space-y-1">
                              <label className="text-[9px] font-black text-slate-455 uppercase tracking-widest font-sans">
                                Numéro de Téléphone *
                              </label>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                  type="tel"
                                  required
                                  value={guestPhone}
                                  onChange={(e) => setGuestPhone(e.target.value)}
                                  placeholder="ex: +33 6 12 34 56 78"
                                  className="w-full bg-slate-50/50 border border-slate-205 focus:border-slate-400 rounded-xl py-2 pl-9 pr-3 text-xs font-mono text-slate-800 outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dates and Guests Grid */}
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-450 font-sans flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                          Étape 2 : Votre Voyage & Calendrier
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                          <div className="text-left space-y-1">
                            <label className="text-[9px] font-black text-slate-455 uppercase tracking-widest font-sans flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-slate-400" />
                              Date d'Arrivée *
                            </label>
                            <input
                              type="date"
                              required
                              value={checkIn}
                              onChange={(e) => setCheckIn(e.target.value)}
                              className="w-full bg-slate-50/50 border border-slate-205 focus:border-slate-400 rounded-xl py-2 px-3 text-xs font-sans text-slate-800 outline-none"
                            />
                          </div>

                          <div className="text-left space-y-1">
                            <label className="text-[9px] font-black text-slate-455 uppercase tracking-widest font-sans flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-slate-400" />
                              Date de Départ *
                            </label>
                            <input
                              type="date"
                              required
                              value={checkOut}
                              onChange={(e) => setCheckOut(e.target.value)}
                              className="w-full bg-slate-50/50 border border-slate-205 focus:border-slate-400 rounded-xl py-2 px-3 text-xs font-sans text-slate-800 outline-none"
                            />
                          </div>

                          <div className="text-left space-y-1">
                            <label className="text-[9px] font-black text-slate-455 uppercase tracking-widest font-sans flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              Voyageurs *
                            </label>
                            <select
                              value={guestsCount}
                              onChange={(e) => setGuestsCount(Number(e.target.value))}
                              className="w-full bg-slate-50/50 border border-slate-205 focus:border-slate-400 rounded-xl py-2 px-3 text-xs font-sans text-slate-800 outline-none"
                            >
                              {Array.from({ length: selectedApartment.maxGuests }, (_, index) => (
                                <option key={index + 1} value={index + 1}>
                                  {index + 1} Voyageur{index > 0 ? "s" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Comments */}
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-black text-slate-455 uppercase tracking-widest font-sans">
                          Commentaires / Demandes spéciales (Optionnel)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Notez ici les informations d'arrivée, besoins de transferts, lits d'enfants ou régimes souhaités..."
                          rows={2.5}
                          className="w-full bg-slate-50/50 border border-slate-205 focus:border-slate-400 rounded-xl py-2 px-3 text-xs font-sans text-slate-850 outline-none resize-none"
                        />
                      </div>

                      {/* Financial projection preview panel */}
                      {nights > 0 && (
                        <div className="bg-amber-50/58 border border-amber-100 rounded-xl p-4 text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                          <div className="space-y-0.5">
                            <div className="text-[10px] text-amber-700 font-extrabold uppercase tracking-widest font-sans">Estimation Tarifaire de votre séjour</div>
                            <div className="text-[11px] text-slate-500 font-sans leading-relaxed">
                              Séjour prestigieux de <span className="font-bold text-slate-700">{nights} nuits</span> pour <span className="font-bold text-slate-700">{guestsCount} voyageur(s)</span>.
                            </div>
                          </div>
                          
                          <div className="text-right sm:border-l sm:border-amber-200 sm:pl-5 shrink-0">
                            <div className="text-xs text-slate-500 font-sans">Tarif estimé</div>
                            <div className="text-xl font-mono font-black text-slate-900 leading-none mt-0.5">{totalAmount} €</div>
                            <span className="text-[9px] text-slate-400 font-sans">Toutes charges incluses</span>
                          </div>
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3.5">
                        <button
                          type="button"
                          onClick={resetForm}
                          disabled={submitting}
                          className="px-5 py-2.5 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          Changer de Logement
                        </button>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center gap-2 active:scale-98"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              <span>Validation de l'Axe...</span>
                            </>
                          ) : (
                            <span>Confirmer la Réservation</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="p-8 border-t border-slate-200 mt-12 bg-white text-slate-400 text-center font-sans text-[10px] leading-relaxed">
        <p>© 2026 SpaceOne Écosystème. Porté et sécurisé par Cloud Enterprise Firestore. Tous droits réservés.</p>
        <p className="mt-1 flex items-center justify-center gap-1">
          <span>Plateforme Hébergeurs Privés • Développé en conformité avec les directives RGPD</span>
        </p>
      </footer>
    </div>
  );
}
