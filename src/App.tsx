import React, { useState, useEffect } from "react";
import { Apartment, Booking, CleaningTask, MessageThread, HomeOwner } from "./types";

// Components
import ApartmentsTab from "./components/ApartmentsTab";
import BookingsTab from "./components/BookingsTab";
import CleaningTab from "./components/CleaningTab";
import CalendarTab from "./components/CalendarTab";
import CommunicationTab from "./components/CommunicationTab";

// Firebase
import { db, auth, handleFirestoreError, OperationType } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

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
  Menu,
  X,
  LogOut,
  User,
  Mail,
  Lock,
  Compass,
  Users,
  ShieldAlert,
  Edit,
  Check,
  Power,
  RefreshCw,
  Eye,
  Trash2,
} from "lucide-react";

export default function App() {
  // Auth and tenant states
  const [currentUser, setCurrentUser] = useState<HomeOwner | null>(null);
  const isRegisteringRef = React.useRef(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regBusinessName, setRegBusinessName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoadingSpace, setIsLoadingSpace] = useState(false);

  // State lists
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTask[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [allUsers, setAllUsers] = useState<HomeOwner[]>([]); // For admin use

  // View control
  const [activeTab, setActiveTab] = useState<"overview" | "apartments" | "bookings" | "cleaning" | "chat" | "admin">("overview");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Admin Workspace state
  const [adminSubTab, setAdminSubTab] = useState<"users" | "apartments" | "bookings">("users");
  const [editingUser, setEditingUser] = useState<HomeOwner | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editRole, setEditRole] = useState<"espace" | "admin">("espace");

  // Gemini configuration notification state
  const [aiConfigured, setAiConfigured] = useState<boolean>(true);

  // Auth observer subscription
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (isRegisteringRef.current) {
          // Skip general load - registering handler manages state setup
          return;
        }
        setIsLoadingSpace(true);
        try {
          const userDocSnap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as HomeOwner;
            if (userData.suspended) {
              setAuthError("Votre compte d'hébergeur a été suspendu par l'administration.");
              await signOut(auth);
              setCurrentUser(null);
            } else {
              setCurrentUser(userData);
              setAuthError("");
            }
          } else {
            // Self-healing database insert to address request #3
            const isSystemAdmin = (firebaseUser.email?.toLowerCase() === "admin@spaceone.com" || firebaseUser.email?.toLowerCase() === "jeremytopaka@gmail.com");
            const healedUser: HomeOwner = {
              id: firebaseUser.uid,
              email: firebaseUser.email || "",
              fullName: firebaseUser.displayName || "Membre SpaceOne",
              businessName: "Espace Conciergerie",
              createdAt: new Date().toISOString(),
              role: isSystemAdmin ? "admin" : "espace",
              suspended: false,
            };
            try {
              await setDoc(doc(db, "users", firebaseUser.uid), healedUser);
            } catch (writeErr) {
              console.warn("Could not auto-heal user doc in Firestore:", writeErr);
            }
            setCurrentUser(healedUser);
            setAuthError("");
          }
        } catch (e) {
          console.error("Error reading authenticated user info from Firestore", e);
          setAuthError("Impossible de synchroniser votre compte depuis la base Firestore.");
        } finally {
          setIsLoadingSpace(false);
        }
      } else {
        setCurrentUser(null);
      }
    });

    // Check Gemini API support
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

    return () => unsubscribeAuth();
  }, []);

  // Real-time Firestore sync based on authenticated user and roles
  useEffect(() => {
    if (!currentUser) {
      setApartments([]);
      setBookings([]);
      setCleaningTasks([]);
      setThreads([]);
      setAllUsers([]);
      return;
    }

    const uid = currentUser.id;
    const isUserAdmin = currentUser.role === "admin";

    // 1. Listen to Apartments
    const apartmentsQuery = isUserAdmin
      ? collection(db, "apartments")
      : query(collection(db, "apartments"), where("ownerId", "==", uid));

    const unsubscribeApts = onSnapshot(apartmentsQuery, (snapshot) => {
      const list: Apartment[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Apartment);
      });
      setApartments(list);
    }, (error) => {
      console.error("Firestore onSnapshot failure (apartments)", error);
    });

    // 2. Listen to Bookings
    const bookingsQuery = isUserAdmin
      ? collection(db, "bookings")
      : query(collection(db, "bookings"), where("ownerId", "==", uid));

    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      const list: Booking[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Booking);
      });
      setBookings(list);
    }, (error) => {
      console.error("Firestore onSnapshot failure (bookings)", error);
    });

    // 3. Listen to CleaningTasks
    const cleaningQuery = isUserAdmin
      ? collection(db, "cleaningTasks")
      : query(collection(db, "cleaningTasks"), where("ownerId", "==", uid));

    const unsubscribeCleaning = onSnapshot(cleaningQuery, (snapshot) => {
      const list: CleaningTask[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as CleaningTask);
      });
      setCleaningTasks(list);
    }, (error) => {
      console.error("Firestore onSnapshot failure (cleaning)", error);
    });

    // 4. Listen to Threads
    const threadsQuery = isUserAdmin
      ? collection(db, "threads")
      : query(collection(db, "threads"), where("ownerId", "==", uid));

    const unsubscribeThreads = onSnapshot(threadsQuery, (snapshot) => {
      const list: MessageThread[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as MessageThread);
      });
      setThreads(list);
    }, (error) => {
      console.error("Firestore onSnapshot failure (threads)", error);
    });

    // 5. Admin extra listener - all users
    let unsubscribeUsers = () => {};
    if (isUserAdmin) {
      const usersQuery = collection(db, "users");
      unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const list: HomeOwner[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as HomeOwner);
        });
        setAllUsers(list);
      }, (error) => {
        console.error("Firestore onSnapshot failure (users)", error);
      });
    }

    return () => {
      unsubscribeApts();
      unsubscribeBookings();
      unsubscribeCleaning();
      unsubscribeThreads();
      unsubscribeUsers();
    };
  }, [currentUser]);

  // Auth Action Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setAuthError("Veuillez remplir tous les champs.");
      return;
    }
    setAuthError("");
    setIsLoadingSpace(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const userSnap = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userSnap.exists()) {
        const userData = userSnap.data() as HomeOwner;
        if (userData.suspended) {
          setAuthError("Votre compte d'hébergeur a été suspendu par l'administration.");
          await signOut(auth);
          setCurrentUser(null);
        } else {
          setCurrentUser(userData);
          setAuthError("");
        }
      } else {
        const isSystemAdmin = (loginEmail.toLowerCase() === "admin@spaceone.com" || loginEmail.toLowerCase() === "jeremytopaka@gmail.com");
        const fallbackUser: HomeOwner = {
          id: userCredential.user.uid,
          email: loginEmail,
          fullName: userCredential.user.displayName || "Utilisateur SpaceOne",
          businessName: "Espace Conciergerie",
          createdAt: new Date().toISOString(),
          role: isSystemAdmin ? "admin" : "espace",
          suspended: false,
        };
        await setDoc(doc(db, "users", userCredential.user.uid), fallbackUser);
        setCurrentUser(fallbackUser);
      }
    } catch (error: any) {
      console.error("Login call failed", error);
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        setAuthError("Identifiants de sécurité invalides. Veuillez réessayer.");
      } else {
        setAuthError(`Erreur d'authentification : ${error.message || error}`);
      }
    } finally {
      setIsLoadingSpace(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regBusinessName || !regEmail || !regPassword) {
      setAuthError("Veuillez remplir tous les champs.");
      return;
    }
    setAuthError("");
    setIsLoadingSpace(true);
    isRegisteringRef.current = true; // Block auth state observer race conditions

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      const userId = userCredential.user.uid;

      const emailLower = regEmail.toLowerCase();
      // Ensure specific target emails receive the required Admin status dynamically
      const isSystemAdmin = emailLower === "admin@spaceone.com" || emailLower === "jeremytopaka@gmail.com";
      const role = isSystemAdmin ? "admin" : "espace";

      const newOwner: HomeOwner = {
        id: userId,
        fullName: regFullName,
        businessName: regBusinessName,
        email: regEmail,
        createdAt: new Date().toISOString(),
        role: role,
        suspended: false,
      };

      // Create main metadata in Firebase
      await setDoc(doc(db, "users", userId), newOwner);
      setCurrentUser(newOwner);

      setRegFullName("");
      setRegBusinessName("");
      setRegEmail("");
      setRegPassword("");
      setAuthError("");
    } catch (error: any) {
      console.error("Registration call failed", error);
      if (error.code === "auth/email-already-in-use") {
        setAuthError("Cet e-mail est déjà utilisé par un autre hébergeur.");
      } else if (error.code === "auth/weak-password") {
        setAuthError("Votre mot de passe doit contenir au moins 6 caractères.");
      } else {
        setAuthError(`Erreur lors de l'inscription : ${error.message || error}`);
      }
    } finally {
      isRegisteringRef.current = false; // Reset block
      setIsLoadingSpace(false);
    }
  };

  // Firestore Entity Mutation Actions
  const handleAddApartment = async (apt: Apartment) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "apartments"), {
        name: apt.name,
        address: apt.address,
        rooms: Number(apt.rooms),
        beds: Number(apt.beds),
        maxGuests: Number(apt.maxGuests),
        status: apt.status || "free",
        thumbnail: apt.thumbnail || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
        ownerId: currentUser.id,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "apartments");
    }
  };

  const handleUpdateApartment = async (apt: Apartment) => {
    if (!currentUser) return;
    try {
      const docRef = doc(db, "apartments", apt.id);
      await setDoc(docRef, {
        ...apt,
        ownerId: apt.ownerId || currentUser.id,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `apartments/${apt.id}`);
    }
  };

  const handleDeleteApartment = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "apartments", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `apartments/${id}`);
    }
  };

  // Booking Handlers
  const handleAddBooking = async (booking: Booking) => {
    if (!currentUser) return;
    try {
      const bookingData = {
        apartmentId: booking.apartmentId,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guestsCount: Number(booking.guestsCount),
        totalAmount: Number(booking.totalAmount),
        status: booking.status,
        notes: booking.notes || "",
        ownerId: currentUser.id,
      };

      const bookingRef = await addDoc(collection(db, "bookings"), bookingData);

      // Auto update apartment status to occupied or scheduled
      const aptRef = doc(db, "apartments", booking.apartmentId);
      await updateDoc(aptRef, {
        status: booking.status === "active" ? "occupied" : "scheduled",
      });

      // Auto create cleaning task for check-out day
      await addDoc(collection(db, "cleaningTasks"), {
        apartmentId: booking.apartmentId,
        bookingId: bookingRef.id,
        date: booking.checkOut,
        status: "pending",
        cleanerName: "Amélie Dubois",
        notes: `Nettoyage de rotation systématique suite au départ de ${booking.guestName}.`,
        checklist: [
          { id: "c1", text: "Retirer et laver le linge de lit", done: false },
          { id: "c2", text: "Nettoyer et désinfecter la salle de bains", done: false },
          { id: "c3", text: "Aspirer et laver les sols", done: false }
        ],
        ownerId: currentUser.id,
      });

      // Auto create instant chat thread
      await addDoc(collection(db, "threads"), {
        bookingId: bookingRef.id,
        guestName: booking.guestName,
        apartmentName: apartments.find((a) => a.id === booking.apartmentId)?.name || "Logement de prestige",
        lastUpdated: new Date().toISOString(),
        ownerId: currentUser.id,
        messages: [
          {
            id: `msg-${Date.now()}`,
            sender: "host",
            text: `Bonjour ${booking.guestName} ! Nous sommes ravis d'enregistrer votre séjour. N'hésitez pas à nous poser des questions sur votre arrivée autonome.`,
            timestamp: new Date().toISOString(),
          }
        ],
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "bookings");
    }
  };

  const handleUpdateBooking = async (booking: Booking) => {
    if (!currentUser) return;
    try {
      const docRef = doc(db, "bookings", booking.id);
      await setDoc(docRef, {
        ...booking,
        ownerId: booking.ownerId || currentUser.id,
      });

      // Maintain cascading status mapping (occupied, scheduled, free)
      const aptRef = doc(db, "apartments", booking.apartmentId);
      await updateDoc(aptRef, {
        status:
          booking.status === "active"
            ? "occupied"
            : booking.status === "upcoming"
            ? "scheduled"
            : "free",
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "bookings", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bookings/${id}`);
    }
  };

  // Cleaning Tasks
  const handleAddCleaningTask = async (task: CleaningTask) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "cleaningTasks"), {
        apartmentId: task.apartmentId,
        bookingId: task.bookingId,
        date: task.date,
        status: task.status,
        cleanerName: task.cleanerName,
        notes: task.notes || "",
        checklist: task.checklist || [],
        ownerId: currentUser.id,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "cleaningTasks");
    }
  };

  const handleUpdateCleaningTask = async (task: CleaningTask) => {
    if (!currentUser) return;
    try {
      const docRef = doc(db, "cleaningTasks", task.id);
      await setDoc(docRef, {
        ...task,
        ownerId: task.ownerId || currentUser.id,
      });

      // Secure free-state propagation
      if (task.status === "completed") {
        const aptRef = doc(db, "apartments", task.apartmentId);
        const aptSnap = await getDoc(aptRef);
        if (aptSnap.exists() && aptSnap.data()?.status !== "occupied") {
          await updateDoc(aptRef, { status: "free" });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cleaningTasks/${task.id}`);
    }
  };

  const handleDeleteCleaningTask = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "cleaningTasks", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `cleaningTasks/${id}`);
    }
  };

  // Chat Messenger
  const handleAddMessage = async (threadId: string, text: string, sender: "host" | "guest") => {
    if (!currentUser) return;
    const matched = threads.find((t) => t.id === threadId);
    if (!matched) return;
    try {
      const docRef = doc(db, "threads", threadId);
      await setDoc(docRef, {
        ...matched,
        lastUpdated: new Date().toISOString(),
        messages: [
          ...matched.messages,
          {
            id: `msg-${Date.now()}`,
            sender,
            text,
            timestamp: new Date().toISOString(),
          }
        ],
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `threads/${threadId}`);
    }
  };

  // Admin Dashboard Core Actions
  const handleToggleUserSuspension = async (targetUser: HomeOwner) => {
    if (!currentUser || currentUser.role !== "admin") return;
    try {
      const userRef = doc(db, "users", targetUser.id);
      await updateDoc(userRef, {
        suspended: !targetUser.suspended,
      });
    } catch (error) {
      console.error("Failed to toggle suspension", error);
    }
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== "admin" || !editingUser) return;
    try {
      const userRef = doc(db, "users", editingUser.id);
      await updateDoc(userRef, {
        fullName: editFullName,
        businessName: editBusinessName,
        role: editRole,
      });
      setEditingUser(null);
    } catch (error) {
      console.error("Failed to save edited user settings", error);
    }
  };

  // Light aesthetic Auth view with modern design home in background
  if (!currentUser) {
    return (
      <div
        id="auth-root"
        className="min-h-screen text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative bg-neutral-50"
      >
        {/* Beautiful high-end modern luxury architectural background with manicured front yard */}
        <div className="absolute inset-0 overflow-hidden z-0">
          <img
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80"
            alt="Contemporary prestige modern residence with green lawn front yard landscape"
            className="absolute inset-0 w-full h-full object-cover select-none"
            referrerPolicy="no-referrer"
          />
          {/* Subtle dark layout shading for content contrast */}
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" />
          {/* Soft sunset warmth overlay */}
          <div className="absolute top-1/4 right-[5%] w-72 h-72 bg-amber-500/10 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-[20%] left-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl opacity-40" />
        </div>

        {/* Auth Navbar */}
        <header className="p-6 md:p-8 max-w-7xl mx-auto w-full flex items-center justify-between z-10 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md relative overflow-hidden">
              <Layers className="w-5 h-5 text-white" />
              <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-0.5 -right-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-black tracking-wider text-slate-800 font-mono">
                  SPACE
                </span>
                <span className="text-[10px] font-black tracking-wide text-blue-700 bg-blue-50 border border-blue-100/50 px-1.5 py-0.5 rounded-md font-mono">
                  ONE
                </span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 font-sans uppercase tracking-widest mt-0.5">
                Conciergerie de Prestige
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/80 border border-slate-200 text-slate-600 text-[10px] font-bold tracking-wider uppercase font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse block"></span>
            <span>Portail Cloud Firebase</span>
          </div>
        </header>

        {/* Central Auth Login/Register Frame */}
        <main className="flex-grow flex items-center justify-center p-4 md:p-8 z-10 w-full max-w-lg mx-auto relative">
          <div className="w-full bg-white/95 border border-slate-200/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col space-y-6 relative z-10">
            
            {/* Form Headers */}
            <div className="text-center space-y-1.5">
              <h2 className="text-xl md:text-2xl font-black font-sans tracking-tight text-slate-800 uppercase">
                {authMode === "login" ? "Accès Hébergeur" : "Créer votre Espace"}
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans leading-relaxed">
                {authMode === "login" 
                  ? "Saisissez vos identifiants de sécurité pour ouvrir votre dashboard unifié en temps réel."
                  : "Accédez à un PMS haut de gamme avec assistants de messagerie IA."}
              </p>
            </div>

            {/* Toggle tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 border border-slate-200/50 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setAuthMode("login");
                }}
                className={`py-2 text-[10px] font-black font-sans rounded-lg transition-all cursor-pointer uppercase tracking-widest ${
                  authMode === "login"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setAuthMode("register");
                }}
                className={`py-2 text-[10px] font-black font-sans rounded-lg transition-all cursor-pointer uppercase tracking-widest ${
                  authMode === "register"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                S'inscrire
              </button>
            </div>

            {/* Error notifications */}
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-sans flex items-start gap-2.5 animate-pulse font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div>{authError}</div>
              </div>
            )}

            {/* Form Renderer */}
            {authMode === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
                    Email de Connexion
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="ex: thomas.bernard@spaceone.com"
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-sans text-slate-800 placeholder-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-slate-800 placeholder-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingSpace}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold tracking-widest uppercase shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  {isLoadingSpace && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Entrer dans l'Espace</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
                    Nom Complet du gestionnaire
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="Thomas Bernard"
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-sans text-slate-800 placeholder-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
                    Nom de votre Espace / Conciergerie
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={regBusinessName}
                      onChange={(e) => setRegBusinessName(e.target.value)}
                      placeholder="Étoiles & Sommets Paris"
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-sans text-slate-800 placeholder-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="contact@etoilesommets.com"
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-sans text-slate-800 placeholder-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="6+ caractères"
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-slate-800 placeholder-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingSpace}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold tracking-widest uppercase shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  {isLoadingSpace && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Créer mon Espace</span>
                </button>
              </form>
            )}

          </div>
        </main>

        {/* Auth footer */}
        <footer className="p-6 text-center text-[9px] text-slate-400 font-sans border-t border-slate-200 bg-slate-50">
          © 2026 SpaceOne Conciergerie de Prestige. Tous droits r�
026 SpaceOne Conciergerie de Prestige. Tous droits réservés. Version 1.2 Enterprise.
        </footer>
      </div>
    );
  }

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
      {/* Slide Menu Dropdown/Drawer Backdrop */}
      {isMenuOpen && (
        <div 
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity duration-300 animate-fade-in cursor-pointer"
        />
      )}

      {/* Slide Menu Drawer Panel */}
      <div 
        className={`fixed inset-y-0 left-0 w-80 max-w-[calc(100vw-3rem)] bg-white z-55 shadow-2xl border-r border-slate-100 flex flex-col h-full transform transition-transform duration-300 ease-out ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Slide Menu Header (Brand and Close Button) */}
        <div className="p-6 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-900 rounded-xl flex items-center justify-center text-white shadow-md border border-slate-800 ring-4 ring-blue-500/10 shrink-0 relative overflow-hidden">
              <Layers className="w-5 h-5 text-blue-400" />
              <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-0.5 -right-0.5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-black tracking-wider text-slate-900 font-mono">
                  SPACE
                </span>
                <span className="text-[10px] font-black tracking-wide text-blue-600 bg-blue-50 border border-blue-100/50 px-1.5 py-0.5 rounded-md font-mono">
                  ONE
                </span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 font-sans uppercase tracking-widest mt-0.5">
                Conciergerie de Prestige
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Homeowner Business & User Profile Badge */}
        {currentUser && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {/* Profile Avatar with elegant space profile badge */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-750 text-white font-extrabold flex items-center justify-center text-xs tracking-wider shadow-sm border border-white ring-2 ring-blue-600/10 shrink-0">
                {currentUser.fullName ? currentUser.fullName.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2) : "H"}
              </div>
              <div className="flex-grow min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate font-sans">
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] text-slate-400 truncate font-mono">
                  {currentUser.email}
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span>
                  <span className="text-[10px] font-extrabold text-blue-600 truncate uppercase tracking-wider font-sans">
                    {currentUser.businessName}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Sign out / Switch owner workspace button */}
            <button
              onClick={() => {
                localStorage.removeItem("spaceone_current_owner");
                setCurrentUser(null);
                setIsMenuOpen(false);
              }}
              className="w-full text-center py-2 rounded-lg border border-slate-200 hover:border-red-250 bg-white hover:bg-rose-50 text-[10px] font-bold text-slate-500 hover:text-red-650 transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-550" />
              <span>Changer d'Espace</span>
            </button>
          </div>
        )}

        {/* Slide Menu Navigation Links */}
        <nav className="p-6 space-y-2 flex-grow overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans mb-4 px-2">
            Navigation Principale
          </div>
          
          <button
            onClick={() => {
              setActiveTab("overview");
              setIsMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold font-sans transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <CalendarIcon className={`w-4 h-4 ${activeTab === "overview" ? "text-white" : "text-slate-400"}`} />
            <div className="flex-grow text-left">Aperçu & Calendrier</div>
          </button>

          <button
            onClick={() => {
              setActiveTab("apartments");
              setIsMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold font-sans transition-all cursor-pointer ${
              activeTab === "apartments"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Building className={`w-4 h-4 ${activeTab === "apartments" ? "text-white" : "text-slate-400"}`} />
            <div className="flex-grow text-left">Logements de SpaceOne</div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "apartments" ? "bg-blue-500 text-white/90" : "bg-slate-100 text-slate-500 font-mono"
            }`}>
              {apartments.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("bookings");
              setIsMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold font-sans transition-all cursor-pointer ${
              activeTab === "bookings"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Briefcase className={`w-4 h-4 ${activeTab === "bookings" ? "text-white" : "text-slate-400"}`} />
            <div className="flex-grow text-left">Réservations</div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "bookings" ? "bg-blue-500 text-white/90" : "bg-slate-100 text-slate-500 font-mono"
            }`}>
              {bookings.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("cleaning");
              setIsMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold font-sans transition-all cursor-pointer ${
              activeTab === "cleaning"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Wrench className={`w-4 h-4 ${activeTab === "cleaning" ? "text-white" : "text-slate-400"}`} />
            <div className="flex-grow text-left">Tâches de Ménage</div>
            {pendingTurnoversCount > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "cleaning" ? "bg-blue-500 text-white/90" : "bg-red-50 text-red-600 font-mono"
              }`}>
                {pendingTurnoversCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("chat");
              setIsMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold font-sans transition-all cursor-pointer relative ${
              activeTab === "chat"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <MessageSquare className={`w-4 h-4 ${activeTab === "chat" ? "text-white" : "text-slate-400"}`} />
            <div className="flex-grow text-left">Messagerie AI</div>
            {threads.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "chat" ? "bg-blue-500 text-white/90" : "bg-blue-50 text-blue-600 font-mono"
              }`}>
                {threads.length}
              </span>
            )}
            {activeTab !== "chat" && (
              <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            )}
          </button>
        </nav>

        {/* Slide Menu Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-400 font-sans">
            © 2026 SpaceOne. Tous droits réservés. Accès sécurisé.
          </p>
        </div>
      </div>

      {/* Upper Navigation Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-45 shadow-3xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          {/* Éléments de marque */}
          <div className="flex items-center gap-3 md:gap-4.5">
            <div className="w-11 h-11 bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-900 rounded-xl flex items-center justify-center text-white shadow-lg border border-slate-800 ring-4 ring-blue-500/10 shrink-0 relative overflow-hidden group">
              <Layers className="w-5.5 h-5.5 text-blue-400 transition-transform duration-300 group-hover:scale-110" />
              <Sparkles className="w-3 h-3 text-amber-300 absolute -top-0.5 -right-0.5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg md:text-xl font-black tracking-wider text-slate-900 font-mono leading-none">
                  SPACE
                </span>
                <span className="text-[10px] md:text-xs font-black tracking-wide text-blue-600 bg-blue-50 border border-blue-100/50 px-2 py-0.5 rounded-lg font-mono">
                  ONE
                </span>
              </div>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-400 font-sans tracking-wide mt-1">
                Portail de Conciergerie & PMS de Prestige
              </p>
            </div>
          </div>

          {/* Actions & Menu Trigger Button */}
          <div className="flex items-center gap-3">
            {/* Desktop-only quick info badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-bold tracking-wider uppercase font-sans">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse block"></span>
              <span>Système Actif</span>
            </div>

            {/* Menu toggle button */}
            <button
              id="menu-toggle-btn"
              onClick={() => setIsMenuOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md font-semibold tracking-wider font-sans text-xs uppercase cursor-pointer transition-all duration-200 border border-transparent ring-2 ring-blue-600/10 active:scale-95"
              title="Ouvrir le menu de navigation"
            >
              <Menu className="w-4 h-4" />
              <span>Menu</span>
            </button>
          </div>
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
              L'assistant de messagerie de SpaceOne fonctionnera avec des modèles locaux limités. Pour débloquer la génération premium de réponses rédigées par l'IA de SpaceOne, configurez la clé <code className="font-mono bg-amber-100 px-1 py-0.5 rounded-sm">GEMINI_API_KEY</code> dans votre panneau des Secrets.
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            {/* Dashboard Business Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 rounded-2xl p-6 md:p-8 text-white shadow-xl border border-slate-800">
              {/* Background ambient accents */}
              <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/20 text-blue-300 text-[10px] font-black uppercase tracking-widest font-sans">
                      Hébergeur Actif : {currentUser?.fullName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/20 text-emerald-300 text-[10px] font-bold uppercase tracking-widest font-sans flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Espace Sécurisé
                    </span>
                  </div>
                  
                  {/* Business Name elegantly rendered */}
                  <h1 className="text-2xl md:text-3.5xl font-extrabold tracking-tight font-sans text-white uppercase drop-shadow-xs">
                    {currentUser?.businessName}
                  </h1>
                  <p className="text-slate-400 text-xs md:text-sm font-sans mt-2 max-w-xl">
                    Tableau de bord de gestion et conciergerie unifiée pour votre parc de logements de prestige. Suivi en temps réel des séjours, rotations de ménage et assistants IA de messagerie.
                  </p>
                </div>

                {/* Profile card widget inside banner */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 flex items-center gap-3.5 md:min-w-[240px] shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md border border-white/20">
                    {currentUser?.fullName ? currentUser.fullName.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2) : "H"}
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider font-sans">Compte Hébergeur</div>
                    <div className="text-sm font-bold text-white truncate font-sans">{currentUser?.fullName}</div>
                    <div className="text-[10px] text-blue-300 font-mono mt-0.5">{currentUser?.email}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Titre principal */}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 font-sans">
                Aperçu de l'Espace & Suivi
              </h2>
              <p className="text-sm text-slate-500 font-sans mt-0.5">
                Surveillance de l'état d'occupation en temps réel, coordination des rotations de nettoyage et messagerie assistée par l'IA de SpaceOne.
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
                    {occupiedCount} sur {totalApartmentsCount} logements occupés de SpaceOne
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
