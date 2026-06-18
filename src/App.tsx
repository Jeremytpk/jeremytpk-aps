import React, { useState, useEffect } from "react";
import { Apartment, Booking, CleaningTask, MessageThread, HomeOwner } from "./types";

// Components
import ApartmentsTab from "./components/ApartmentsTab";
import BookingsTab from "./components/BookingsTab";
import CleaningTab from "./components/CleaningTab";
import CalendarTab from "./components/CalendarTab";
import CommunicationTab from "./components/CommunicationTab";
import ProfileModal from "./components/ProfileModal";
import PublicCatalog from "./components/PublicCatalog";
import spaceOneTextRight from "../assets/SpaceOneTextRight.png";
import spaceOneLogo from "../assets/SpaceOneLogo.png";

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
  Copy,
  Loader2,
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
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regAccountType, setRegAccountType] = useState<"personal" | "partner">("personal");
  const [authError, setAuthError] = useState("");
  const [isLoadingSpace, setIsLoadingSpace] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Public catalog states
  const [publicSpaceId, setPublicSpaceId] = useState<string | null>(null);
  const [publicOwner, setPublicOwner] = useState<HomeOwner | null>(null);
  const [publicPartners, setPublicPartners] = useState<Record<string, HomeOwner>>({});
  const [publicApartments, setPublicApartments] = useState<Apartment[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [forceShowLogin, setForceShowLogin] = useState(false);

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

  // Load public shared catalog if space ID parameter is present, otherwise load global catalog
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spaceId = params.get("space");
    if (spaceId) {
      setPublicSpaceId(spaceId);
      const loadPublicSpace = async () => {
        setPublicLoading(true);
        setPublicError("");
        try {
          const ownerDoc = await getDoc(doc(db, "users", spaceId));
          if (!ownerDoc.exists()) {
            setPublicError("Cet espace conciergerie n'existe pas ou l'adresse est incorrecte.");
            setPublicLoading(false);
            return;
          }
          const ownerData = ownerDoc.data() as HomeOwner;
          setPublicOwner(ownerData);
          setPublicPartners({ [spaceId]: { id: spaceId, ...ownerData } });

          // Listen to or query public apartments
          const q = query(collection(db, "apartments"), where("ownerId", "==", spaceId));
          const snap = await getDocs(q);
          const list: Apartment[] = [];
          snap.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as Apartment);
          });
          setPublicApartments(list);
        } catch (err: any) {
          console.error("Failed to load public workspace:", err);
          setPublicError("Erreur lors du chargement de l'espace de conciergerie.");
        } finally {
          setPublicLoading(false);
        }
      };
      loadPublicSpace();
    } else {
      // Load ALL apartments for the global landing page catalog
      const loadAllPrestige = async () => {
        setPublicLoading(true);
        setPublicError("");
        try {
          const q = query(collection(db, "apartments"));
          const snap = await getDocs(q);
          const list: Apartment[] = [];
          snap.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as Apartment);
          });
          setPublicApartments(list);
          setPublicOwner(null); // Indicates global catalog landing page

          // Load partner details for all listed apartments
          try {
            const usersSnap = await getDocs(collection(db, "users"));
            const partnersMap: Record<string, HomeOwner> = {};
            usersSnap.forEach((doc) => {
              const uData = doc.data() as HomeOwner;
              partnersMap[doc.id] = { id: doc.id, ...uData };
            });
            setPublicPartners(partnersMap);
          } catch (err) {
            console.error("Failed to load global partners for catalog:", err);
          }
        } catch (err: any) {
          console.error("Failed to load global workspace apartments:", err);
          setPublicError("Erreur lors du chargement général des appartements.");
        } finally {
          setPublicLoading(false);
        }
      };
      loadAllPrestige();
    }
  }, []);

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
    const isUserPersonal = currentUser.role === "personal";

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

    // 5. Admin and Client extra listener - all users
    let unsubscribeUsers = () => {};
    if (isUserAdmin || isUserPersonal) {
      const usersQuery = collection(db, "users");
      unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const list: HomeOwner[] = [];
        const partnersMap: Record<string, HomeOwner> = {};
        snapshot.forEach((doc) => {
          const uData = { id: doc.id, ...doc.data() } as HomeOwner;
          list.push(uData);
          partnersMap[doc.id] = uData;
        });
        setAllUsers(list);
        setPublicPartners(partnersMap);
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
    
    // Check if passwords match
    if (regPassword !== regConfirmPassword) {
      setAuthError("Les deux mots de passe ne correspondent pas. Veuillez réessayer.");
      return;
    }

    const isPersonal = regAccountType === "personal";
    
    // Validate required fields based on account type
    if (isPersonal) {
      if (!regFullName || !regEmail || !regPassword) {
        setAuthError("Veuillez remplir tous les champs requis.");
        return;
      }
    } else {
      if (!regFullName || !regBusinessName || !regEmail || !regPassword) {
        setAuthError("Veuillez remplir tous les champs requis, y compris le nom de votre Conciergerie.");
        return;
      }
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
      const role = isSystemAdmin ? "admin" : (isPersonal ? "personal" : "espace");

      const newOwner: HomeOwner = {
        id: userId,
        fullName: regFullName,
        businessName: isPersonal ? "Compte Personnel" : regBusinessName,
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
      setRegConfirmPassword("");
      setAuthError("");
    } catch (error: any) {
      console.error("Registration call failed", error);
      if (error.code === "auth/email-already-in-use") {
        setAuthError("Cet e-mail est déjà utilisé par un autre hébergeur ou utilisateur.");
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

  // Public Catalog & Global Landing Page Routing
  if (!currentUser && !forceShowLogin) {
    if (publicLoading) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
          <p className="text-xs font-bold font-sans text-slate-500 uppercase tracking-widest">Chargement de l'Espace de Prestige...</p>
        </div>
      );
    }
    if (publicError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xl font-bold">⚠️</div>
          <p className="text-sm font-semibold text-slate-700 max-w-sm font-sans">{publicError}</p>
          <button onClick={() => window.location.href = window.location.origin} className="text-xs font-bold text-blue-600 underline">Retour au portail d'accueil</button>
        </div>
      );
    }
    return (
      <PublicCatalog
        spaceId={publicSpaceId}
        owner={publicOwner}
        apartments={publicApartments}
        partners={publicPartners}
        onLoginClick={() => setForceShowLogin(true)}
        onBookingSuccess={() => {
          // Re-fetch public apartments on successful booking to update real-time statistics
          const q = publicSpaceId
            ? query(collection(db, "apartments"), where("ownerId", "==", publicSpaceId))
            : query(collection(db, "apartments"));
          getDocs(q).then((snap) => {
            const list: Apartment[] = [];
            snap.forEach((doc) => {
              list.push({ id: doc.id, ...doc.data() } as Apartment);
            });
            setPublicApartments(list);
          }).catch(e => console.error("Error refreshing public active apartments:", e));
        }}
      />
    );
  }

  // Route logged-in personal role accounts (Guests) to the custom Client Portal
  if (currentUser && currentUser.role === "personal") {
    return (
      <PublicCatalog
        spaceId={null}
        owner={null}
        apartments={apartments}
        partners={publicPartners}
        onBookingSuccess={() => {}}
        currentUser={currentUser}
        onLogout={async () => {
          await signOut(auth);
          setCurrentUser(null);
        }}
        bookings={bookings}
        threads={threads}
        onAddMessage={handleAddMessage}
      />
    );
  }

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
          <div></div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setForceShowLogin(false)}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 border border-slate-200 hover:border-slate-300 rounded-xl bg-white/90 hover:bg-white text-slate-700 font-extrabold tracking-wider font-sans text-[10px] uppercase cursor-pointer transition-all shadow-xs active:scale-95"
            >
              <span>← Voir le Catalogue</span>
            </button>
          </div>
        </header>

        {/* Central Auth Login/Register Frame */}
        <main className="flex-grow flex items-center justify-center p-4 md:p-8 z-10 w-full max-w-lg mx-auto relative">
          <div className="w-full bg-white/95 border border-slate-200/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col space-y-6 relative z-10">
            
            {/* Form Headers with exactly 7px space under Logo */}
            <div className="text-center">
              {/* Logo image on top of Login container */}
              <div className="flex justify-center animate-fadeIn" style={{ marginBottom: "7px" }}>
                <img 
                  src={spaceOneLogo} 
                  alt="SpaceOne Logo" 
                  className="h-28 w-auto object-contain rounded-[15px]" 
                  style={{ borderRadius: '15px' }}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              <h2 className="text-xl md:text-2xl font-black font-sans tracking-tight text-slate-800 uppercase">
                {authMode === "login" ? "Accès Hébergeur" : "Créer votre Espace"}
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans leading-relaxed mt-1.5 animate-fadeIn">
                {authMode === "login" 
                  ? "Saisissez vos identifiants de sécurité pour ouvrir votre dashboard unifié en temps réel."
                  : "Accédez à un PMS haut de gamme with assistants de messagerie IA."}
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
                
                {/* Choix du type de compte (Personnel vs Partenaire) */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
                    Type de compte désiré
                  </label>
                  <div className="grid grid-cols-2 p-1 bg-slate-100 border border-slate-200/50 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError("");
                        setRegAccountType("personal");
                      }}
                      className={`py-2 text-[10px] font-bold font-sans rounded-lg transition-all cursor-pointer text-center uppercase tracking-wider ${
                        regAccountType === "personal"
                          ? "bg-white text-blue-750 shadow-xs border border-slate-200"
                          : "text-slate-550 hover:text-slate-800"
                      }`}
                    >
                      Personnel (Client)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError("");
                        setRegAccountType("partner");
                      }}
                      className={`py-2 text-[10px] font-bold font-sans rounded-lg transition-all cursor-pointer text-center uppercase tracking-wider ${
                        regAccountType === "partner"
                          ? "bg-white text-blue-750 shadow-xs border border-slate-200"
                          : "text-slate-550 hover:text-slate-800"
                      }`}
                    >
                      Partenaire (Concierge)
                    </button>
                  </div>
                </div>

                {/* Nom Complet */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
                    {regAccountType === "personal" ? "Votre Nom Complet" : "Nom Complet du gestionnaire"}
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

                {/* Nom Conciergerie (Uniquement si Partenaire) */}
                {regAccountType === "partner" && (
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
                )}

                {/* Email */}
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
                      placeholder={regAccountType === "personal" ? "votre.email@domaine.com" : "contact@etoilesommets.com"}
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-sans text-slate-800 placeholder-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Mot de passe */}
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

                {/* Confirmation Mot de passe */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Saisissez à nouveau"
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
                  <span>{regAccountType === "personal" ? "Créer mon Compte" : "Créer mon Espace"}</span>
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
          <div className="flex items-center">
            <img 
              src={spaceOneTextRight} 
              alt="SpaceOne" 
              className="h-[55px] w-auto object-contain rounded-[15px]" 
              style={{ borderRadius: '15px' }}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
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
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-10 h-10 rounded-full object-cover shadow-sm border border-white ring-2 ring-blue-600/10 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-750 text-white font-extrabold flex items-center justify-center text-xs tracking-wider shadow-sm border border-white ring-2 ring-blue-600/10 shrink-0">
                  {currentUser.fullName ? currentUser.fullName.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2) : "H"}
                </div>
              )}
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
            
            <div className="grid grid-cols-2 gap-2">
              {/* Profile settings button */}
              <button
                onClick={() => {
                  setIsProfileOpen(true);
                  setIsMenuOpen(false);
                }}
                className="text-center py-2 rounded-lg border border-slate-200 hover:border-blue-250 bg-white hover:bg-slate-100 text-[10px] font-bold text-slate-600 hover:text-blue-600 transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                title="Gérer mon profil"
              >
                <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-550" />
                <span>Mon Profil</span>
              </button>

              {/* Sign out / Switch owner workspace button */}
              <button
                onClick={() => {
                  localStorage.removeItem("spaceone_current_owner");
                  setCurrentUser(null);
                  setIsMenuOpen(false);
                }}
                className="text-center py-2 rounded-lg border border-slate-200 hover:border-red-250 bg-white hover:bg-rose-50 text-[10px] font-bold text-slate-500 hover:text-red-650 transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                title="Se déconnecter"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-450 group-hover:text-red-550" />
                <span>Quitter</span>
              </button>
            </div>
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
          {/* Menu button on the left with Branding elements */}
          <div className="flex items-center gap-3 md:gap-4.5">
            {/* Menu toggle button */}
            <button
              id="menu-toggle-btn"
              onClick={() => setIsMenuOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md font-semibold tracking-wider font-sans text-xs uppercase cursor-pointer transition-all duration-200 border border-transparent ring-2 ring-blue-600/10 active:scale-95 shrink-0"
              title="Ouvrir le menu de navigation"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">Menu</span>
            </button>

            {/* Éléments de marque */}
            <div className="flex items-center">
              <img 
                src={spaceOneTextRight} 
                alt="SpaceOne" 
                className="h-[55px] md:h-[63px] w-auto object-contain rounded-[15px]" 
                style={{ borderRadius: '15px' }}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Actions on the right */}
          <div className="flex items-center gap-3">
            {/* Desktop-only quick info badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-bold tracking-wider uppercase font-sans">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse block"></span>
              <span>Système Actif</span>
            </div>
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
                  
                  {/* Share Space direct link */}
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        const clientUrl = `${window.location.origin}/?space=${currentUser?.id}`;
                        navigator.clipboard.writeText(clientUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 3000);
                      }}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-sans font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md border border-blue-500 active:scale-97"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedLink ? "Lien copié ! ✓" : "Partager l'Espace aux Clients 🔗"}</span>
                    </button>
                  </div>
                </div>

                {/* Profile card widget inside banner */}
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-md rounded-xl p-4 flex items-center gap-3.5 md:min-w-[240px] shrink-0 text-left cursor-pointer transition-all duration-200 group active:scale-98"
                  title="Modifier mon profil"
                >
                  {currentUser?.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName}
                      className="w-12 h-12 rounded-full object-cover shadow-sm border border-white/20 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md border border-white/20 shrink-0">
                      {currentUser?.fullName ? currentUser.fullName.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2) : "H"}
                    </div>
                  )}
                  <div className="text-left flex-grow min-w-0">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans flex items-center gap-1">
                      <span>Compte Hébergeur</span>
                      <span className="text-blue-400 font-extrabold group-hover:translate-x-0.5 transition-transform">⚙</span>
                    </div>
                    <div className="text-sm font-bold text-white truncate font-sans">{currentUser?.fullName}</div>
                    <div className="text-[10px] text-blue-350 font-mono mt-0.5 truncate">{currentUser?.email}</div>
                  </div>
                </button>
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
                    {totalEarningsInFlow} $
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

      {currentUser && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onProfileUpdated={(updatedUser) => setCurrentUser(updatedUser)}
        />
      )}
    </div>
  );
}
