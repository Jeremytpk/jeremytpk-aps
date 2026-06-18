import React, { useState, useEffect, useMemo } from "react";
import { Apartment, Booking, HomeOwner, MessageThread } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { formatDateToFR } from "../utils";
import spaceOneTextRight from "../../assets/SpaceOneTextRight.png";
import SwipeableGallery from "./SwipeableGallery";
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
  ChevronLeft,
  Image,
  User,
  DollarSign,
  LogOut,
  MessageSquare,
  Send,
  Tag
} from "lucide-react";

interface PublicCatalogProps {
  spaceId: string | null;
  owner: HomeOwner | null;
  apartments: Apartment[];
  onBookingSuccess: () => void;
  onLoginClick?: () => void;
  currentUser?: HomeOwner | null;
  onLogout?: () => void;
  bookings?: Booking[];
  threads?: MessageThread[];
  onAddMessage?: (threadId: string, text: string, sender: "host" | "guest") => Promise<void>;
  partners?: Record<string, HomeOwner>;
}

export default function PublicCatalog({
  spaceId,
  owner,
  apartments,
  onBookingSuccess,
  onLoginClick,
  currentUser,
  onLogout,
  bookings = [],
  threads = [],
  onAddMessage,
  partners = {}
}: PublicCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  
  // Client states
  const [clientTab, setClientTab] = useState<"explore" | "bookings" | "chat">("explore");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [chatMessageText, setChatMessageText] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("all");

  // Extract partners who have apartments for easy filtering
  const activePartnersMap = useMemo(() => {
    const list: Record<string, HomeOwner> = {};
    apartments.forEach(apt => {
      if (apt.ownerId && partners && partners[apt.ownerId]) {
        list[apt.ownerId] = partners[apt.ownerId];
      }
    });
    return list;
  }, [apartments, partners]);
  
  // Custom states for images viewing and dynamic owner loading for global catalog
  const [dynamicOwner, setDynamicOwner] = useState<HomeOwner | null>(owner);

  useEffect(() => {
    if (owner) {
      setDynamicOwner(owner);
    }
  }, [owner]);

  useEffect(() => {
    if (selectedApartment && (!dynamicOwner || dynamicOwner.id !== selectedApartment.ownerId)) {
      const fetchOwner = async () => {
        try {
          const ownerDocSnap = await getDoc(doc(db, "users", selectedApartment.ownerId));
          if (ownerDocSnap.exists()) {
            setDynamicOwner({ id: ownerDocSnap.id, ...ownerDocSnap.data() } as HomeOwner);
          }
        } catch (e) {
          console.error("Error fetching dynamic apartment owner:", e);
        }
      };
      fetchOwner();
    }
  }, [selectedApartment]);
  
  // Custom states for images viewing
  const [activeImageIdx, setActiveImageIdx] = useState(0); // for selected apartment gallery
  const [activeIndexes, setActiveIndexes] = useState<Record<string, number>>({}); // for grid cards sliders
  
  // Booking Form State
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestHasWhatsApp, setGuestHasWhatsApp] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);
  const [notes, setNotes] = useState("");

  // Automatically prefill name and email for logged-in personal accounts
  useEffect(() => {
    if (currentUser) {
      setGuestName(currentUser.fullName || "");
      setGuestEmail(currentUser.email || "");
    }
  }, [currentUser]);

  // Status handlers
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successBookingId, setSuccessBookingId] = useState("");

  // Search filter
  const filteredApts = apartments.filter(apt => {
    const matchesSearch = apt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          apt.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPartner = selectedPartnerId === "all" || apt.ownerId === selectedPartnerId;
    return matchesSearch && matchesPartner;
  });

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
    ? (selectedApartment.discountPrice !== undefined 
         ? selectedApartment.discountPrice 
         : (selectedApartment.pricePerNight !== undefined ? selectedApartment.pricePerNight : (120 + (selectedApartment.rooms * 40) + (selectedApartment.maxGuests * 20))))
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

      const targetOwnerId = selectedApartment.ownerId || spaceId || "";

      // 1. Write booking to database
      const bookingDocRef = await addDoc(collection(db, pathBookings), {
        apartmentId: selectedApartment.id,
        ownerId: targetOwnerId,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
        guestHasWhatsApp,
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
        ownerId: targetOwnerId,
        messages: [
          {
            id: `msg-${Date.now()}-1`,
            sender: "guest",
            text: `Bonjour, je viens de finaliser ma réservation pour ${selectedApartment.name} du ${formatDateToFR(checkIn)} au ${formatDateToFR(checkOut)}. (${nights} nuits, ${guestsCount} voyageurs). ${notes ? `Note spéciale : "${notes}"` : ""}`,
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
    setActiveImageIdx(0);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestHasWhatsApp(false);
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
        <header className="px-6 py-5 max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-md z-50 sticky top-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 md:gap-5">
            <img 
              src={spaceOneTextRight} 
              alt="SpaceOne" 
              className="h-[95px] md:h-[103px] w-auto object-contain shrink-0 rounded-[15px]" 
              style={{ borderRadius: '15px' }}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            {owner && (
              <>
                <div className="hidden sm:block h-6 w-px bg-slate-200" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-md relative overflow-hidden shrink-0">
                    <Layers className="w-4 h-4 text-white" />
                    <Sparkles className="w-2 h-2 text-blue-400 absolute -top-0.5 -right-0.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 leading-none">
                      <span className="text-sm font-black tracking-wider text-slate-800 font-mono">
                        {owner.businessName.toUpperCase()}
                      </span>
                      <span className="text-[9px] font-black tracking-wide text-blue-700 bg-blue-50 border border-blue-100/50 px-1.5 py-0.5 rounded-md font-mono uppercase">
                        Privé
                      </span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 font-sans uppercase tracking-widest mt-1">
                      Partenaire • Gérant : {owner.fullName}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-3">
            <div className="hidden md:inline-flex px-3 py-1 bg-teal-50 border border-teal-100/60 text-teal-700 text-[10px] font-bold tracking-wider uppercase rounded-full items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              Réservation Directe Sécurisée
            </div>
            
            {currentUser ? (
              <div className="flex items-center gap-3">
                {/* User Info Badge */}
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200/60 rounded-xl text-left">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0">
                    {currentUser.fullName.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2)}
                  </div>
                  <div className="max-w-[120px] sm:max-w-xs truncate">
                    <div className="text-[10px] font-bold text-slate-800 leading-none truncate">{currentUser.fullName}</div>
                    <div className="text-[8px] font-mono text-slate-500 mt-0.5 leading-none truncate">{currentUser.email}</div>
                  </div>
                </div>

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-rose-200/60 active:scale-95"
                    title="Se déconnecter"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Déconnexion</span>
                  </button>
                )}
              </div>
            ) : (
              onLoginClick && (
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm border border-slate-950 active:scale-95"
                  title="Accéder à l'espace hébergeur"
                >
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Connexion</span>
                </button>
              )
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-10">
          
          {/* Client Tab Switcher if logged in */}
          {currentUser && (
            <div className="mb-8 flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 w-fit">
              <button
                type="button"
                onClick={() => setClientTab("explore")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  clientTab === "explore"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Catalogue Prestige</span>
              </button>

              <button
                type="button"
                onClick={() => setClientTab("bookings")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  clientTab === "bookings"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Mes Réservations ({bookings.filter(b => b.guestEmail.toLowerCase() === currentUser.email.toLowerCase()).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setClientTab("chat")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  clientTab === "chat"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Mes Échanges ({threads.filter(t => t.guestName.toLowerCase() === currentUser.fullName.toLowerCase() || bookings.filter(b => b.guestEmail.toLowerCase() === currentUser.email.toLowerCase()).some(b => b.id === t.bookingId)).length})</span>
              </button>
            </div>
          )}

          {clientTab === "bookings" && currentUser && (
            <div className="space-y-6 animate-fadeIn text-left">
              <h2 className="text-xl font-bold font-sans text-slate-800 tracking-tight">Vos Réservations de Prestige</h2>
              <p className="text-xs text-slate-500 font-sans">Retrouvez l'historique et le suivi de vos séjours exclusifs et coordonnez avec vos concierges.</p>
              
              {(() => {
                const myBookings = bookings.filter(b => b.guestEmail.toLowerCase() === currentUser.email.toLowerCase());
                if (myBookings.length === 0) {
                  return (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/60 p-8 space-y-2">
                      <Building className="w-10 h-10 text-slate-300 mx-auto animate-pulse" />
                      <h3 className="text-sm font-bold text-slate-700 font-sans">Aucun séjour planifié</h3>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto font-sans">Explorez notre catalogue exclusif pour réserver votre première résidence.</p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 gap-6">
                    {myBookings.map((b) => {
                      const apt = apartments.find(a => a.id === b.apartmentId);
                      return (
                        <div key={b.id} className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <div className="w-20 h-20 rounded-2xl bg-slate-105 overflow-hidden border border-slate-200/60 shrink-0">
                              {apt?.images?.[0] ? (
                                <img src={apt.images[0]} alt={apt.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-xs">SO</div>
                              )}
                            </div>
                            <div className="space-y-1.5 text-left">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                  b.status === "upcoming" ? "bg-blue-50 text-blue-600 border border-blue-105" :
                                  b.status === "active" ? "bg-emerald-50 text-emerald-600 border border-emerald-105" :
                                  "bg-slate-50 text-slate-505 border border-slate-150"
                                }`}>
                                  {b.status === "upcoming" ? "À venir" : b.status === "active" ? "En cours" : "Terminé"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono font-bold">Ref: {b.id.substring(0, 8)}</span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 font-sans">{apt?.name || "Résidence SpaceOne"}</h4>
                              <p className="text-xs text-slate-400 flex items-center gap-1 font-sans"><MapPin className="w-3 h-3 shrink-0" /> {apt?.address || "Adresse de prestige"}</p>
                              <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                                <span className="font-sans flex items-center gap-1 font-semibold"><CalendarDays className="w-3.5 h-3.5 text-slate-400" /> {formatDateToFR(b.checkIn)} au {formatDateToFR(b.checkOut)}</span>
                                <span className="font-mono text-slate-500 font-semibold">{b.guestsCount} Voyageur{b.guestsCount > 1 ? "s" : ""}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Montant final</span>
                              <span className="text-lg font-mono font-bold text-slate-900">{b.totalAmount} $</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const match = threads.find(t => t.bookingId === b.id);
                                if (match) {
                                  setSelectedThreadId(match.id);
                                }
                                setClientTab("chat");
                              }}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Discussion Assistée</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {clientTab === "chat" && currentUser && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn min-h-[500px]">
              {(() => {
                const myBookings = bookings.filter(b => b.guestEmail.toLowerCase() === currentUser.email.toLowerCase());
                const myThreads = threads.filter(t => t.guestName.toLowerCase() === currentUser.fullName.toLowerCase() || myBookings.some(b => b.id === t.bookingId));
                
                if (myThreads.length === 0) {
                  return (
                    <div className="md:col-span-3 flex flex-col items-center justify-center p-8 text-center space-y-3">
                      <MessageSquare className="w-12 h-12 text-slate-300 animate-pulse" />
                      <h3 className="text-sm font-bold text-slate-700 font-sans">Aucun échange en cours</h3>
                      <p className="text-xs text-slate-400 max-w-sm font-sans mx-auto leading-relaxed">
                        Les fils de discussion de vos séjours apparaîtront ici automatiquement une fois qu'une réservation est confirmée.
                      </p>
                    </div>
                  );
                }
                
                const activeThread = myThreads.find(t => t.id === selectedThreadId) || myThreads[0];
                const activeBooking = bookings.find(b => b.id === activeThread?.bookingId);
                const activeApt = activeBooking ? apartments.find(a => a.id === activeBooking.apartmentId) : null;
                
                return (
                  <>
                    {/* Inbox threads sidebar */}
                    <div className="md:col-span-1 border-r border-slate-100 flex flex-col pr-4 space-y-3 text-left">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2">Conversations</div>
                      <div className="space-y-1.5 flex-grow overflow-y-auto max-h-[400px]">
                        {myThreads.map((t) => {
                          const isSel = t.id === activeThread?.id;
                          const bkg = bookings.find(b => b.id === t.bookingId);
                          const apt = bkg ? apartments.find(a => a.id === bkg.apartmentId) : null;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setSelectedThreadId(t.id)}
                              className={`w-full p-3 rounded-2xl text-left transition-all block focus:outline-none cursor-pointer ${
                                isSel ? "bg-slate-100 border border-slate-200" : "hover:bg-slate-50 border border-transparent"
                              }`}
                            >
                              <div className="text-xs font-bold text-slate-900 truncate leading-none mb-1">{apt?.name || "Résidence SpaceOne"}</div>
                              <div className="text-[10px] text-slate-400 truncate leading-none flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{apt?.address || "Prestige Space"}</div>
                              {t.messages.length > 0 && (
                                <p className="text-[10px] text-slate-650 truncate mt-2 pl-1.5 border-l border-slate-300">{t.messages[t.messages.length - 1].text}</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Chat screen */}
                    {activeThread ? (
                      <div className="md:col-span-2 flex flex-col justify-between h-[450px] md:h-full relative pl-2">
                        {/* Header details */}
                        <div className="pb-3 border-b border-rose-100/50 flex items-center justify-between text-left">
                          <div>
                            <div className="text-xs font-bold text-slate-900 font-sans">{activeApt?.name || "Conciergerie SpaceOne"}</div>
                            <div className="text-[8px] font-mono text-slate-400 mt-0.5">FIL DE DISCUSSION : {activeThread.id}</div>
                          </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-grow my-4 overflow-y-auto space-y-3 pr-2 flex flex-col py-1" style={{ maxHeight: "300px" }}>
                          {activeThread.messages.map((m) => {
                            const isMe = m.sender === "guest";
                            return (
                              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fadeIn`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-xs font-sans leading-relaxed text-left shadow-2xs ${
                                  isMe
                                    ? "bg-slate-900 text-white rounded-br-none"
                                    : "bg-slate-105 text-slate-800 rounded-bl-none"
                                }`}>
                                  <p>{m.text}</p>
                                  <span className={`text-[7px] text-slate-400 block mt-1 text-right`}>{formatDateToFR(m.timestamp)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Input Area */}
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!chatMessageText.trim() || !onAddMessage) return;
                            try {
                              await onAddMessage(activeThread.id, chatMessageText.trim(), "guest");
                              setChatMessageText("");
                            } catch (error) {
                              console.error("Failed to add public chat message", error);
                            }
                          }}
                          className="flex gap-2 items-center pt-3 border-t border-slate-100"
                        >
                          <input
                            type="text"
                            value={chatMessageText}
                            onChange={(e) => setChatMessageText(e.target.value)}
                            placeholder="Rédigez votre réponse confidentielle..."
                            className="flex-grow bg-slate-100 border border-slate-200 focus:outline-none focus:border-slate-400 rounded-xl px-4 py-2 text-xs font-sans text-slate-800"
                          />
                          <button
                            type="submit"
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="md:col-span-2 flex items-center justify-center text-slate-400 text-xs">Veuillez sélectionner un échange de prestige.</div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {clientTab === "explore" && (
            <>
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
                Parcourez nos hébergements haut de gamme d'exception gérés par {owner ? <strong className="text-white">la conciergerie {owner.businessName}</strong> : "nos gérants d'exception"}. Trouvez le lieu idéal pour vos vacances ou votre déplacement professionnel et réservez immédiatement en toute autonomie.
              </p>
            </div>
            
            <div className="mt-6 md:mt-0 relative z-10 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-5 shrink-0 flex items-center gap-3">
              {owner ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-white font-black flex items-center justify-center text-sm border-2 border-white/15 shrink-0">
                    SO
                  </div>
                  <div className="text-left">
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-sans">Plateforme Prestige</div>
                    <div className="text-sm font-bold text-white font-sans">SpaceOne Conciergerie</div>
                    <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Système Actif
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {!selectedApartment ? (
            <div className="space-y-8 animate-fade-in">
              {/* Filter and counts bar */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-sm font-bold text-slate-700 font-sans">
                  {filteredApts.length} {filteredApts.length > 1 ? "appartements disponibles" : "appartement disponible"}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center max-w-xl w-full">
                  {!owner && Object.keys(activePartnersMap).length > 0 && (
                    <select
                      value={selectedPartnerId}
                      onChange={(e) => setSelectedPartnerId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-sans text-slate-800 focus:outline-none focus:border-slate-350 cursor-pointer"
                    >
                      <option value="all">Toutes Conciergeries</option>
                      {Object.keys(activePartnersMap).map((key) => {
                        const p = activePartnersMap[key];
                        return (
                          <option key={p.id} value={p.id}>
                            {p.businessName || p.fullName}
                          </option>
                        );
                      })}
                    </select>
                  )}

                  <div className="relative flex-grow">
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
                    const roomPrice = apt.pricePerNight !== undefined ? apt.pricePerNight : (120 + (apt.rooms * 40) + (apt.maxGuests * 20));
                    return (
                      <div 
                        key={apt.id}
                        className="bg-white border border-slate-205/85 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
                      >
                        <div>
                          {/* Image Box */}
                          <div className="relative overflow-hidden bg-slate-100 rounded-t-2xl">
                            <SwipeableGallery
                              images={apt.images && apt.images.length >= 3 ? apt.images : [apt.thumbnail]}
                              activeIndex={activeIndexes[apt.id] || 0}
                              onChangeIndex={(newIdx) => {
                                setActiveIndexes(prev => ({
                                  ...prev,
                                  [apt.id]: newIdx
                                }));
                              }}
                              aspectClass="aspect-[16/10]"
                              showControls={true}
                              showDots={true}
                              showCounter={true}
                            />
                            
                            {/* Premium pill */}
                            <div className="absolute top-3.5 left-3.5 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-wider text-white border border-white/10 flex items-center gap-1 font-mono z-10 select-none pointer-events-none">
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              Prestige Class
                            </div>

                            {/* Offer Badge indicator */}
                            {apt.discountPrice !== undefined && (
                              <div className="absolute top-3.5 right-3.5 px-2.5 py-1 bg-amber-500/90 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-wider text-white border border-amber-400/20 flex items-center gap-1 font-mono z-10 select-none pointer-events-none animate-fadeIn">
                                <Tag className="w-2.5 h-2.5 text-white shrink-0 animate-pulse" />
                                <span>Offre De Prestige</span>
                              </div>
                            )}

                            {/* Status and price pill */}
                            {apt.discountPrice !== undefined ? (
                              <div className="absolute bottom-3.5 right-3.5 px-3 py-1.5 bg-white/95 backdrop-blur-md text-slate-900 rounded-xl font-sans font-bold shadow-md text-xs border border-amber-200 z-10 pointer-events-none select-none flex flex-col items-end">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 line-through font-medium leading-none">{roomPrice} $</span>
                                  <span className="font-extrabold text-amber-700 text-sm leading-none">{apt.discountPrice} $</span>
                                </div>
                                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wide font-sans mt-0.5">/ nuit • Offre Spéciale</span>
                              </div>
                            ) : (
                              <div className="absolute bottom-3.5 right-3.5 px-3 py-1.5 bg-white/95 backdrop-blur-md text-slate-900 rounded-xl font-sans font-bold shadow-md text-xs border border-white z-10 pointer-events-none select-none">
                                À partir de <span className="font-extrabold text-blue-700 text-sm">{roomPrice} $</span> <span className="text-[10px] text-slate-500 font-medium font-sans">/ nuit</span>
                              </div>
                            )}
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

                              {apt.ownerId && partners && partners[apt.ownerId] && (
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50/70 border border-blue-100 rounded text-[9.5px] font-semibold text-blue-700 font-sans mt-0.5">
                                  <Building className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                  <span>Gérant : {partners[apt.ownerId].businessName}</span>
                                </div>
                              )}
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
                  {/* Interactive Multi-Image Gallery */}
                  <div className="relative border-b border-slate-100">
                    <SwipeableGallery
                      images={selectedApartment.images && selectedApartment.images.length >= 3 ? selectedApartment.images : [selectedApartment.thumbnail]}
                      activeIndex={activeImageIdx}
                      onChangeIndex={setActiveImageIdx}
                      aspectClass="aspect-[16/10]"
                      showControls={true}
                      showDots={true}
                      showCounter={true}
                      tagText="Sélection Premium"
                    />

                    {/* Thumbnails Row below the main image box */}
                    {(() => {
                      const selImages = selectedApartment.images && selectedApartment.images.length >= 3 ? selectedApartment.images : [selectedApartment.thumbnail];
                      if (selImages.length <= 1) return null;
                      return (
                        <div className="bg-slate-900 p-3 flex items-center gap-2 overflow-x-auto scrollbar-none select-none">
                          {selImages.map((img, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setActiveImageIdx(i)}
                              className={`relative w-16 h-11 shrink-0 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                                i === activeImageIdx 
                                  ? "border-blue-500 scale-102 opacity-100" 
                                  : "border-transparent opacity-60 hover:opacity-90"
                              }`}
                            >
                              <img
                                src={img}
                                alt={`Aperçu ${i + 1}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </button>
                          ))}
                        </div>
                      );
                    })()}
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
                          Félicitations ! Votre demande de séjour de prestige a été validée et enregistrée en temps réel dans l'espace de <strong className="text-slate-800">{dynamicOwner?.businessName || owner?.businessName || "SpaceOne Conciergerie"}</strong>.
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 max-w-sm mx-auto text-left font-mono text-[11px] space-y-2 text-slate-650">
                        <div>
                          <strong className="text-slate-800">Dossier :</strong> {successBookingId}
                        </div>
                        <div>
                          <strong className="text-slate-800">Séjour :</strong> du {formatDateToFR(checkIn)} au {formatDateToFR(checkOut)} ({nights} nuits)
                        </div>
                        <div>
                          <strong className="text-slate-800">Logement :</strong> {selectedApartment.name}
                        </div>
                        <div>
                          <strong className="text-slate-800">Montant :</strong> {totalAmount} $
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 font-sans max-w-xs mx-auto leading-relaxed">
                        Aucun compte requis. Le gérant {dynamicOwner?.fullName || owner?.fullName || "SpaceOne Conciergerie"} a été notifié instantanément et prendra contact avec vous par Email ou Téléphone.
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
                              
                              {/* WhatsApp Verification Checkbox */}
                              <div className="flex items-center gap-2 mt-1.5 pl-1">
                                <input
                                  type="checkbox"
                                  id="is-whatsapp"
                                  checked={guestHasWhatsApp}
                                  onChange={(e) => setGuestHasWhatsApp(e.target.checked)}
                                  className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="is-whatsapp" className="text-[10px] font-semibold text-slate-500 cursor-pointer select-none flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                  Ce numéro est sur WhatsApp
                                </label>
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
                            <div className="text-xl font-mono font-black text-slate-900 leading-none mt-0.5">{totalAmount} $</div>
                            {selectedApartment.discountPrice !== undefined ? (
                              <span className="text-[9px] text-emerald-650 font-bold block mt-0.5">Offre Spéciale Appliquée</span>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-sans block mt-0.5">Toutes charges incluses</span>
                            )}
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
          </>
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
