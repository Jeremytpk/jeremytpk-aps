import React, { useState, useEffect } from "react";
import { Apartment, Booking, CleaningTask, MessageThread } from "./types";
import {
  initialApartments,
  initialBookings,
  initialCleaningTasks,
  initialMessageThreads,
} from "./seedData";

// Components
import ApartmentsTab from "./components/ApartmentsTab";
import BookingsTab from "./components/BookingsTab";
import CleaningTab from "./components/CleaningTab";
import CalendarTab from "./components/CalendarTab";
import CommunicationTab from "./components/CommunicationTab";

// Icons
import {
  Building,
  Calendar as CalendarIcon,
  MessageSquare,
  Sparkles,
  Layers,
  Wrench,
  CheckCircle,
  Clock,
  Briefcase,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

export default function App() {
  // State lists
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTask[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);

  // View control
  const [activeTab, setActiveTab] = useState<"overview" | "apartments" | "bookings" | "cleaning" | "chat">("overview");

  // Gemini configuration notification state
  const [aiConfigured, setAiConfigured] = useState<boolean>(true);

  // Load initial Seed data on mount
  useEffect(() => {
    // Look in custom standard localStorage so edits are persisted across preview refreshes
    const savedApt = localStorage.getItem("airbnb_pms_apartments");
    const savedBookings = localStorage.getItem("airbnb_pms_bookings");
    const savedClean = localStorage.getItem("airbnb_pms_cleaning");
    const savedThreads = localStorage.getItem("airbnb_pms_threads");

    if (savedApt) setApartments(JSON.parse(savedApt));
    else setApartments(initialApartments);

    if (savedBookings) setBookings(JSON.parse(savedBookings));
    else setBookings(initialBookings);

    if (savedClean) setCleaningTasks(JSON.parse(savedClean));
    else setCleaningTasks(initialCleaningTasks);

    if (savedThreads) setThreads(JSON.parse(savedThreads));
    else setThreads(initialMessageThreads);

    // Verify if backend server reports proper Gemini configuration
    fetch("/api/ai-status")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.configured === "boolean") {
          setAiConfigured(data.configured);
        }
      })
      .catch((err) => {
        console.warn("Could not query server API key status, defaulting true:", err);
      });
  }, []);

  // Sync state to standard localStorage
  const saveAll = (
    newApts: Apartment[],
    newBookings: Booking[],
    newClean: CleaningTask[],
    newThreads: MessageThread[]
  ) => {
    localStorage.setItem("airbnb_pms_apartments", JSON.stringify(newApts));
    localStorage.setItem("airbnb_pms_bookings", JSON.stringify(newBookings));
    localStorage.setItem("airbnb_pms_cleaning", JSON.stringify(newClean));
    localStorage.setItem("airbnb_pms_threads", JSON.stringify(newThreads));
  };

  // Apartment Handlers
  const handleAddApartment = (apt: Apartment) => {
    const updated = [...apartments, apt];
    setApartments(updated);
    saveAll(updated, bookings, cleaningTasks, threads);
  };

  const handleUpdateApartment = (apt: Apartment) => {
    const updated = apartments.map((a) => (a.id === apt.id ? apt : a));
    setApartments(updated);
    saveAll(updated, bookings, cleaningTasks, threads);
  };

  const handleDeleteApartment = (id: string) => {
    const updatedApts = apartments.filter((a) => a.id !== id);
    const updatedBookings = bookings.filter((b) => b.apartmentId !== id);
    const updatedClean = cleaningTasks.filter((c) => c.apartmentId !== id);

    setApartments(updatedApts);
    setBookings(updatedBookings);
    setCleaningTasks(updatedClean);
    saveAll(updatedApts, updatedBookings, updatedClean, threads);
  };

  // Booking Handlers
  const handleAddBooking = (booking: Booking) => {
    const updatedBookings = [...bookings, booking];

    // Auto-update high-level apartment status to "occupied" if stay is currently active, or "scheduled"
    const updatedApts = apartments.map((apt) => {
      if (apt.id === booking.apartmentId) {
        return {
          ...apt,
          status: booking.status === "active" ? ("occupied" as const) : ("scheduled" as const),
        };
      }
      return apt;
    });

    // Auto-génération d'un fil de discussion
    const newThread: MessageThread = {
      id: "thread-" + Date.now(),
      bookingId: booking.id,
      guestName: booking.guestName,
      apartmentName: apartments.find((a) => a.id === booking.apartmentId)?.name || "Logement",
      lastUpdated: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}-welcome`,
          sender: "host",
          text: `Bonjour ${booking.guestName} ! Nous sommes ravis de vous confirmer votre séjour du ${booking.checkIn} au ${booking.checkOut} à l'Auberge Paul Sungani. N'hésitez pas si vous avez des questions !`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    const updatedThreads = [...threads, newThread];

    // Auto-génération d'une tâche de ménage pour la date de départ
    const newClean: CleaningTask = {
      id: "clean-" + Date.now(),
      apartmentId: booking.apartmentId,
      bookingId: booking.id,
      date: booking.checkOut,
      status: "pending",
      cleanerName: "Amélie Dubois",
      notes: `Nettoyage de départ standard planifié automatiquement suite au départ de ${booking.guestName}.`,
      checklist: [
        { id: `c-${Date.now()}-1`, text: "Changer les draps et laver les serviettes", done: false },
        { id: `c-${Date.now()}-2`, text: "Désinfecter la cuisine, nettoyer micro-ondes & frigo", done: false },
        { id: `c-${Date.now()}-3`, text: "Passer l'aspirateur et balayer tous les sols", done: false },
        { id: `c-${Date.now()}-4`, text: "Recharger l'essentiel : produits de toilette, café & thé", done: false },
        { id: `c-${Date.now()}-5`, text: "Désinfecter et briquer la salle de bains", done: false },
      ],
    };
    const updatedCleanTasks = [...cleaningTasks, newClean];

    setApartments(updatedApts);
    setBookings(updatedBookings);
    setCleaningTasks(updatedCleanTasks);
    setThreads(updatedThreads);

    saveAll(updatedApts, updatedBookings, updatedCleanTasks, updatedThreads);
  };

  const handleUpdateBooking = (booking: Booking) => {
    const updatedBookings = bookings.map((b) => (b.id === booking.id ? booking : b));

    // Update associated apartments status if required
    const updatedApts = apartments.map((apt) => {
      if (apt.id === booking.apartmentId) {
        return {
          ...apt,
          status:
            booking.status === "active"
              ? ("occupied" as const)
              : booking.status === "upcoming"
              ? ("scheduled" as const)
              : ("free" as const),
        };
      }
      return apt;
    });

    setBookings(updatedBookings);
    setApartments(updatedApts);
    saveAll(updatedApts, updatedBookings, cleaningTasks, threads);
  };

  const handleDeleteBooking = (id: string) => {
    const updatedBookings = bookings.filter((b) => b.id !== id);
    setBookings(updatedBookings);
    saveAll(apartments, updatedBookings, cleaningTasks, threads);
  };

  // Cleaning Handlers
  const handleAddCleaningTask = (task: CleaningTask) => {
    const updated = [...cleaningTasks, task];
    setCleaningTasks(updated);
    saveAll(apartments, bookings, updated, threads);
  };

  const handleUpdateCleaningTask = (task: CleaningTask) => {
    const updated = cleaningTasks.map((c) => (c.id === task.id ? task : c));

    // If a cleaning task transitions to completed, update corresponding apartment status to "free"
    let updatedApts = apartments;
    if (task.status === "completed") {
      updatedApts = apartments.map((apt) => {
        if (apt.id === task.apartmentId && apt.status !== "occupied") {
          return { ...apt, status: "free" as const };
        }
        return apt;
      });
    }

    setCleaningTasks(updated);
    setApartments(updatedApts);
    saveAll(updatedApts, bookings, updated, threads);
  };

  const handleDeleteCleaningTask = (id: string) => {
    const updated = cleaningTasks.filter((c) => c.id !== id);
    setCleaningTasks(updated);
    saveAll(apartments, bookings, updated, threads);
  };

  // Messaging Thread Handlers
  const handleAddMessage = (threadId: string, text: string, sender: "host" | "guest") => {
    const updatedThreads = threads.map((th) => {
      if (th.id === threadId) {
        return {
          ...th,
          lastUpdated: new Date().toISOString(),
          messages: [
            ...th.messages,
            {
              id: "msg-" + Date.now(),
              sender,
              text,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
      return th;
    });

    setThreads(updatedThreads);
    saveAll(apartments, bookings, cleaningTasks, updatedThreads);
  };

  // KPI Calculations
  const totalApartmentsCount = apartments.length;
  const occupiedCount = apartments.filter((a) => a.status === "occupied").length;
  const occupancyPercentage =
    totalApartmentsCount > 0 ? Math.round((occupiedCount / totalApartmentsCount) * 100) : 0;

  const pendingTurnoversCount = cleaningTasks.filter((c) => c.status !== "completed").length;
  const totalEarningsInFlow = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, current) => sum + current.totalAmount, 0);

  return (
    <div id="airbnb-app-root" className="min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-900 selection:text-white pb-16">
      {/* Upper Navigation Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-45 shadow-3xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Éléments de marque */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm font-bold tracking-wider font-sans text-lg border-2 border-white ring-2 ring-blue-600/30">
              APS
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 font-sans leading-none">
                APS "Auberge Paul Sungani"
              </h1>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Portail de Conciergerie & PMS de Prestige
              </p>
            </div>
          </div>

          {/* Menu des onglets */}
          <nav className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-sans transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Aperçu & Calendrier
            </button>
            <button
              id="tab-btn-apartments"
              onClick={() => setActiveTab("apartments")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-sans transition-all cursor-pointer ${
                activeTab === "apartments"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Logements ({apartments.length})
            </button>
            <button
              id="tab-btn-bookings"
              onClick={() => setActiveTab("bookings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-sans transition-all cursor-pointer ${
                activeTab === "bookings"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Réservations ({bookings.length})
            </button>
            <button
              id="tab-btn-cleaning"
              onClick={() => setActiveTab("cleaning")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-sans transition-all cursor-pointer ${
                activeTab === "cleaning"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Ménage ({pendingTurnoversCount} en attente)
            </button>
            <button
              id="tab-btn-communication"
              onClick={() => setActiveTab("chat")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-sans transition-all cursor-pointer relative ${
                activeTab === "chat"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Messagerie ({threads.length})
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-slate-900 animate-ping" />
            </button>
          </nav>
        </div>
      </header>

      {/* Main Workspace Frame container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Alerte si la clé API Gemini est manquante */}
        {!aiConfigured && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3 text-xs leading-relaxed font-sans shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">La clé API Gemini n'est pas configurée.</span>
              L'assistant de messagerie d'Auberge Paul Sungani fonctionnera avec des modèles locaux limités. Pour débloquer la génération premium de réponses rédigées par l'IA d'APS, configurez la clé <code className="font-mono bg-amber-100 px-1 py-0.5 rounded-sm">GEMINI_API_KEY</code> dans votre panneau des Secrets.
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            {/* Titre principal */}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 font-sans">
                Aperçu de l'Auberge & Suivi des Ménages
              </h2>
              <p className="text-sm text-slate-500 font-sans mt-0.5">
                Surveillance de l'état d'occupation en temps réel, coordination des rotations de nettoyage et messagerie assistée par l'IA d'APS.
              </p>
            </div>

            {/* Cartes KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Carte 1: Remplissage */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                    Taux d'Occupation
                  </span>
                  <div className="text-2xl font-bold text-slate-900 font-mono">
                    {occupancyPercentage}%
                  </div>
                  <span className="text-xs text-slate-500 block">
                    {occupiedCount} sur {totalApartmentsCount} logements occupés d'APS
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 text-slate-800 rounded-xl">
                  <Building className="w-6 h-6" />
                </div>
              </div>

              {/* Carte 2: Ménages en attente */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                     Rotations de Ménage
                  </span>
                  <div className="text-2xl font-bold text-slate-900 font-mono">
                    {pendingTurnoversCount} En cours
                  </div>
                  <span className="text-xs text-slate-500 block">
                    Assignés à Amélie Dubois & équipe
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 text-slate-800 rounded-xl">
                  <Wrench className="w-6 h-6" />
                </div>
              </div>

              {/* Carte 3: Revenus accumulés */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                    Revenus Cumulés
                  </span>
                  <div className="text-2xl font-bold text-slate-900 font-mono">
                    {totalEarningsInFlow} €
                  </div>
                  <span className="text-xs text-slate-500 block">
                    Séjours confirmés
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 text-slate-800 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              {/* Carte 4: Discussions de messagerie */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                    Fils de Discussion
                  </span>
                  <div className="text-2xl font-bold text-slate-900 font-mono">
                    {threads.length} Canaux
                  </div>
                  <span className="text-xs text-slate-500 block">
                    Optimisé par Gemini IA
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 text-slate-800 rounded-xl">
                  <MessageSquare className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Occupancy Calendar Matrix (User-facing occupied, free, scheduled calendar) */}
            <CalendarTab apartments={apartments} bookings={bookings} />
          </div>
        )}

        {/* Tab content switching layout */}
        {activeTab === "apartments" && (
          <ApartmentsTab
            apartments={apartments}
            onAddApartment={handleAddApartment}
            onUpdateApartment={handleUpdateApartment}
            onDeleteApartment={handleDeleteApartment}
          />
        )}

        {activeTab === "bookings" && (
          <BookingsTab
            bookings={bookings}
            apartments={apartments}
            onAddBooking={handleAddBooking}
            onUpdateBooking={handleUpdateBooking}
            onDeleteBooking={handleDeleteBooking}
          />
        )}

        {activeTab === "cleaning" && (
          <CleaningTab
            cleaningTasks={cleaningTasks}
            apartments={apartments}
            onAddCleaningTask={handleAddCleaningTask}
            onUpdateCleaningTask={handleUpdateCleaningTask}
            onDeleteCleaningTask={handleDeleteCleaningTask}
          />
        )}

        {activeTab === "chat" && (
          <CommunicationTab
            threads={threads}
            bookings={bookings}
            onAddMessage={handleAddMessage}
          />
        )}
      </main>
    </div>
  );
}
