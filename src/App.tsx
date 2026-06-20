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
import CleaningUpgradeRequestView from "./components/CleaningUpgradeRequestView";
import TermsModal from "./components/TermsModal";
import spaceOneTextRight from "../assets/SpaceOneTextRight.png";
import spaceOneLogo from "../assets/SpaceOneLogo.png";

// Firebase
import firebaseConfig from "../firebase-applet-config.json";
import { initializeApp, getApp } from "firebase/app";
import { getFirestore as getFirestoreSecondary } from "firebase/firestore";
import {
  getAuth as getAuthSecondary,
  createUserWithEmailAndPassword as createUserWithEmailAndPasswordSecondary,
  signOut as signOutSecondary
} from "firebase/auth";
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
  Search,
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
  const [activeTab, setActiveTab] = useState<"overview" | "apartments" | "bookings" | "cleaning" | "chat" | "admin" | "team">(() => {
    const localUserStr = localStorage.getItem("spaceone_custom_user");
    if (localUserStr) {
      try {
        const parsed = JSON.parse(localUserStr);
        if (parsed && parsed.role === "worker") {
          return "cleaning";
        }
      } catch (e) {}
    }
    return "overview";
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [termsDefaultTab, setTermsDefaultTab] = useState<"concierge" | "guest">("concierge");

  // Admin Workspace state
  const [adminSubTab, setAdminSubTab] = useState<"users" | "bookings" | "workers">("users");
  const [editingUser, setEditingUser] = useState<HomeOwner | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editRole, setEditRole] = useState<"espace" | "admin">("espace");
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [selectedConciergeId, setSelectedConciergeId] = useState<string | null>(null);

  const filteredUsers = allUsers
    .filter((u) => u.role === "espace")
    .filter((user) => {
      if (!adminSearchQuery) return true;
      const queryLower = adminSearchQuery.toLowerCase();
      return (
        (user.businessName && user.businessName.toLowerCase().includes(queryLower)) ||
        (user.fullName && user.fullName.toLowerCase().includes(queryLower)) ||
        (user.email && user.email.toLowerCase().includes(queryLower))
      );
    });

  // Worker sub-account creation state
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerEmail, setNewWorkerEmail] = useState("");
  const [newWorkerPassword, setNewWorkerPassword] = useState("");
  const [newWorkerParentId, setNewWorkerParentId] = useState("");
  const [workerFirstName, setWorkerFirstName] = useState("");
  const [workerLastName, setWorkerLastName] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [workerLoginCodeInput, setWorkerLoginCodeInput] = useState("");
  const [workerLoginError, setWorkerLoginError] = useState("");
  const [isCreatingWorker, setIsCreatingWorker] = useState(false);
  const [workerError, setWorkerError] = useState("");
  const [workerSuccess, setWorkerSuccess] = useState("");

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
          const ownerData = { id: ownerDoc.id, ...ownerDoc.data() } as HomeOwner;
          setPublicOwner(ownerData);
          setPublicPartners({ [spaceId]: ownerData });

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

          // Load partner details for all listed apartments by fetching unique owners individually
          try {
            const uniqueOwnerIds = Array.from(new Set(list.map(apt => apt.ownerId).filter(Boolean)));
            const partnersMap: Record<string, HomeOwner> = {};
            await Promise.all(
              uniqueOwnerIds.map(async (ownerId) => {
                try {
                  const ownerDoc = await getDoc(doc(db, "users", ownerId));
                  if (ownerDoc.exists()) {
                    partnersMap[ownerId] = { id: ownerId, ...ownerDoc.data() } as HomeOwner;
                  }
                } catch (singleErr) {
                  console.error(`Failed to load partner detail for owner ${ownerId}:`, singleErr);
                }
              })
            );
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
    // Custom worker / local storage user check first
    const localUserStr = localStorage.getItem("spaceone_custom_user");
    if (localUserStr) {
      setIsLoadingSpace(true);
      try {
        const parsed = JSON.parse(localUserStr) as HomeOwner;
        getDoc(doc(db, "users", parsed.id)).then((docSnap) => {
          if (docSnap.exists()) {
            const freshData = { id: docSnap.id, ...docSnap.data() } as HomeOwner;
            if (freshData.suspended) {
              setAuthError("Votre compte de travailleur a été suspendu par l'administration.");
              localStorage.removeItem("spaceone_custom_user");
              setCurrentUser(null);
            } else {
              setCurrentUser(freshData);
              setAuthError("");
            }
          } else {
            setCurrentUser(parsed);
          }
        }).catch((err) => {
          console.warn("Could not reload custom user, using stored values:", err);
          setCurrentUser(parsed);
        }).finally(() => {
          setIsLoadingSpace(false);
        });
      } catch (err) {
        console.error("Failed to parse custom local user sync:", err);
        setIsLoadingSpace(false);
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (localStorage.getItem("spaceone_custom_user")) {
        // Skip firebase auth observer if custom user is active
        return;
      }
      if (firebaseUser) {
        if (isRegisteringRef.current) {
          // Skip general load - registering handler manages state setup
          return;
        }
        setIsLoadingSpace(true);
        try {
          const userDocSnap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDocSnap.exists()) {
            const userData = { id: userDocSnap.id, ...userDocSnap.data() } as HomeOwner;
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
              approved: isSystemAdmin ? true : false,
              isCleaningAllowed: true,
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
        if (!localStorage.getItem("spaceone_custom_user")) {
          setCurrentUser(null);
        }
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

  // Safeguard: Always redirect worker to their dedicated cleaning tasks page upon active session load
  useEffect(() => {
    if (currentUser && currentUser.role === "worker") {
      setActiveTab("cleaning");
    }
  }, [currentUser]);

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
    // For workers, retrieve apartments, bookings, cleaning tasks, and threads from their parent concierge workspace (parentId)
    const effectiveOwnerId = (currentUser.role === "worker" && currentUser.parentId)
      ? currentUser.parentId
      : uid;

    // 1. Listen to Apartments
    const apartmentsQuery = (isUserAdmin || isUserPersonal)
      ? collection(db, "apartments")
      : query(collection(db, "apartments"), where("ownerId", "==", effectiveOwnerId));

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
    const bookingsQuery = (isUserAdmin || isUserPersonal)
      ? collection(db, "bookings")
      : query(collection(db, "bookings"), where("ownerId", "==", effectiveOwnerId));

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
      : query(collection(db, "cleaningTasks"), where("ownerId", "==", effectiveOwnerId));

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
      : query(collection(db, "threads"), where("ownerId", "==", effectiveOwnerId));

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
    } else if (currentUser.role === "espace") {
      const usersQuery = query(collection(db, "users"), where("parentId", "==", uid));
      unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const list: HomeOwner[] = [];
        snapshot.forEach((doc) => {
          const uData = { id: doc.id, ...doc.data() } as HomeOwner;
          list.push(uData);
        });
        setAllUsers(list);
      }, (error) => {
        console.error("Firestore onSnapshot failure (users for espace)", error);
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

  // Handle Admin user tab routing constraint
  useEffect(() => {
    if (currentUser?.role === "admin" && activeTab === "overview") {
      setActiveTab("admin");
    }
  }, [currentUser, activeTab]);

  // Load partner details dynamically for guest/personal users when their catalog of apartments changes
  useEffect(() => {
    if (currentUser?.role === "personal" && apartments.length > 0) {
      const loadPersonalPartners = async () => {
        try {
          const uniqueOwnerIds: string[] = Array.from(new Set(apartments.map(apt => apt.ownerId)))
            .filter((id): id is string => typeof id === "string" && id !== "");
          const partnersMap: Record<string, HomeOwner> = { ...publicPartners };
          let changed = false;
          await Promise.all(
            uniqueOwnerIds.map(async (ownerId: string) => {
              // If we already have this partner's details, skip fetching
              if (partnersMap[ownerId]) return;
              try {
                const ownerDoc = await getDoc(doc(db, "users", ownerId));
                if (ownerDoc.exists()) {
                  partnersMap[ownerId] = { id: ownerId, ...ownerDoc.data() } as HomeOwner;
                  changed = true;
                }
              } catch (singleErr) {
                console.error(`Failed to load dynamic partner detail for owner ${ownerId}:`, singleErr);
              }
            })
          );
          if (changed) {
            setPublicPartners(partnersMap);
          }
        } catch (err) {
          console.error("Failed to load personal partners dynamically:", err);
        }
      };
      loadPersonalPartners();
    }
  }, [currentUser, apartments]);

  // Auth Action Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setAuthError("Veuillez remplir tous les champs.");
      return;
    }
    setAuthError("");
    setIsLoadingSpace(true);
    localStorage.removeItem("spaceone_custom_user");

    try {
      // 1. Try to check if this is a custom worker account first
      const emailLower = loginEmail.toLowerCase().trim();
      const q = query(collection(db, "users"), where("email", "==", emailLower));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const foundUser = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() } as HomeOwner;
        if (foundUser.role === "worker" && foundUser.password === loginPassword) {
          if (foundUser.suspended) {
            setAuthError("Votre compte de travailleur a été suspendu par l'administration.");
            setIsLoadingSpace(false);
            return;
          }
          // Authenticate in Firebase Auth so that other document readers don't fail due to isSignedIn restrictions
          await signInWithEmailAndPassword(auth, emailLower, loginPassword);
          localStorage.setItem("spaceone_custom_user", JSON.stringify(foundUser));
          setCurrentUser(foundUser);
          setActiveTab("cleaning");
          setAuthError("");
          setIsLoadingSpace(false);
          return;
        }
      }
    } catch (workerErr) {
      console.warn("Worker database check bypassed/failed:", workerErr);
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const userSnap = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userSnap.exists()) {
        const userData = { id: userSnap.id, ...userSnap.data() } as HomeOwner;
        if (userData.suspended) {
          setAuthError("Votre compte d'hébergeur a été suspendu par l'administration.");
          await signOut(auth);
          setCurrentUser(null);
        } else {
          setCurrentUser(userData);
          setActiveTab("overview");
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
          approved: isSystemAdmin ? true : false,
          isCleaningAllowed: true,
        };
        await setDoc(doc(db, "users", userCredential.user.uid), fallbackUser);
        setCurrentUser(fallbackUser);
        setActiveTab("overview");
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

  const handleWorkerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerLoginCodeInput.trim()) {
      setWorkerLoginError("Veuillez saisir votre code d'accès.");
      return;
    }
    setWorkerLoginError("");
    setIsLoadingSpace(true);
    localStorage.removeItem("spaceone_custom_user");

    try {
      const codeClean = workerLoginCodeInput.trim().toLowerCase();
      const q = query(collection(db, "users"), where("loginCode", "==", codeClean));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const foundUser = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() } as HomeOwner;
        if (foundUser.role === "worker") {
          if (foundUser.suspended) {
            setWorkerLoginError("Votre compte de collaborateur a été suspendu par l'administration.");
            setIsLoadingSpace(false);
            return;
          }

          localStorage.setItem("spaceone_custom_user", JSON.stringify(foundUser));
          setCurrentUser(foundUser);
          setActiveTab("cleaning");
          setWorkerLoginError("");
          setWorkerLoginCodeInput("");
        } else {
          setWorkerLoginError("Ce code ne correspond pas à un compte collaborateur.");
        }
      } else {
        setWorkerLoginError("Code d'accès invalide. Veuillez vérifier le code de 7 caractères.");
      }
    } catch (err: any) {
      console.error("Worker code login error:", err);
      setWorkerLoginError("Erreur lors de la synchronisation de la connexion.");
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
        approved: role !== "espace", // Espace needs admin approval; personal and admin don't.
        isCleaningAllowed: true,
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
        images: apt.images || [],
        details: apt.details || "",
        pricePerNight: Number(apt.pricePerNight) || 150,
        ...(apt.discountPrice !== undefined && apt.discountPrice !== null && !isNaN(Number(apt.discountPrice)) ? { discountPrice: Number(apt.discountPrice) } : {}),
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
      // Find the apartment to see who its owner actually is
      const apt = apartments.find(a => a.id === task.apartmentId);
      const computedOwnerId = apt?.ownerId || task.ownerId || currentUser.id;

      await addDoc(collection(db, "cleaningTasks"), {
        apartmentId: task.apartmentId,
        bookingId: task.bookingId,
        date: task.date,
        status: task.status,
        cleanerName: task.cleanerName,
        cleanerId: task.cleanerId || "",
        notes: task.notes || "",
        checklist: task.checklist || [],
        ownerId: computedOwnerId,
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

  const handleToggleUserApproval = async (targetUser: HomeOwner) => {
    if (!currentUser || currentUser.role !== "admin") return;
    try {
      const userRef = doc(db, "users", targetUser.id);
      await updateDoc(userRef, {
        approved: !targetUser.approved,
      });
    } catch (error) {
      console.error("Failed to toggle user approval", error);
    }
  };

  const handleToggleUserCleaning = async (targetUser: HomeOwner) => {
    if (!currentUser || currentUser.role !== "admin") return;
    try {
      const userRef = doc(db, "users", targetUser.id);
      const nextVal = targetUser.isCleaningAllowed === false ? true : false;
      await updateDoc(userRef, {
        isCleaningAllowed: nextVal,
        ...(nextVal ? { isCleaningAccessRequested: false } : {})
      });
    } catch (error) {
      console.error("Failed to toggle cleaning allowed status", error);
    }
  };

  const handleRequestCleaningAccess = async () => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, "users", currentUser.id);
      const now = new Date().toISOString();
      await updateDoc(userRef, {
        isCleaningAccessRequested: true,
        cleaningAccessRequestedAt: now,
      });
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              isCleaningAccessRequested: true,
              cleaningAccessRequestedAt: now,
            }
          : null
      );
    } catch (error) {
      console.error("Failed to submit cleaning access request", error);
      throw error;
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!currentUser) return;
    const resolvedRole = currentUser.role;
    if (resolvedRole !== "admin" && resolvedRole !== "espace") return;
    try {
      await deleteDoc(doc(db, "users", targetUserId));
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  const handleCreateWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!workerFirstName.trim() || !workerLastName.trim() || !workerPhone.trim()) {
      setWorkerError("Veuillez remplir tous les champs (Prénom, Nom de famille, Numéro de contact).");
      return;
    }
    setWorkerError("");
    setWorkerSuccess("");
    setIsCreatingWorker(true);

    try {
      // Generate a unique 7-character login code combining name letters and random numbers
      const fClean = workerFirstName.replace(/[^a-zA-Z]/g, "").toLowerCase();
      const lClean = workerLastName.replace(/[^a-zA-Z]/g, "").toLowerCase();
      const combined = fClean + lClean;
      let letterPrefix = combined.substring(0, 4);
      if (letterPrefix.length < 3) {
        letterPrefix = (letterPrefix + "col").substring(0, 3);
      }
      const digitsNeeded = 7 - letterPrefix.length;
      let randDigits = "";
      for (let i = 0; i < digitsNeeded; i++) {
        randDigits += Math.floor(Math.random() * 10).toString();
      }
      const loginCode = letterPrefix + randDigits;

      const generatedEmail = `${loginCode}@spaceone-worker.com`;
      const generatedPassword = `${loginCode}_secret`;

      // Resolve the parent ID and business name
      const computedParentId = currentUser.role === "admin" ? newWorkerParentId : currentUser.id;
      if (!computedParentId) {
        setWorkerError("Veuillez sélectionner un compte principal (Conciergerie) pour rattacher ce travailleur.");
        setIsCreatingWorker(false);
        return;
      }

      // Find the parent company name
      const parentUser = allUsers.find(u => u.id === computedParentId) || currentUser;
      const computedParentBusiness = parentUser.businessName || "Espace Conciergerie";

      // Register the child worker using secondary app pattern so we don't disrupt current login session!
      let secondApp;
      try {
        secondApp = getApp("SecondaryWorkerApp");
      } catch {
        secondApp = initializeApp(firebaseConfig, "SecondaryWorkerApp");
      }
      const secondAuth = getAuthSecondary(secondApp);
      const secondDb = getFirestoreSecondary(secondApp, firebaseConfig.firestoreDatabaseId);

      // 1. Create client side firebase auth user via secondary app (doesn't log out current user!)
      const cred = await createUserWithEmailAndPasswordSecondary(secondAuth, generatedEmail, generatedPassword);
      const newUid = cred.user.uid;

      // 2. Write user document to users collection using the secondary Firestore context while still authenticated in secondary app
      const workerFullName = `${workerFirstName.trim()} ${workerLastName.trim()}`;
      const newWorker: HomeOwner = {
        id: newUid,
        email: generatedEmail,
        fullName: workerFullName,
        businessName: computedParentBusiness,
        createdAt: new Date().toISOString(),
        role: "worker",
        suspended: false,
        approved: true, // Auto-approved by default when created by an active concierge or admin
        parentId: computedParentId,
        password: generatedPassword, // stored for custom local login check fallback
        isCleaningAllowed: true,
        phone: workerPhone.trim(),
        loginCode: loginCode,
      };

      await setDoc(doc(secondDb, "users", newUid), newWorker);

      // 3. Sign out the secondary app immediately so it is clean
      await signOutSecondary(secondAuth);

      setWorkerSuccess(`Le collaborateur ${workerFullName} a été enregistré ! Son code de connexion unique à 7 caractères est : ${loginCode.toUpperCase()}`);
      setWorkerFirstName("");
      setWorkerLastName("");
      setWorkerPhone("");
    } catch (err: any) {
      console.error("Secondary worker creation error", err);
      if (err.code === "auth/email-already-in-use") {
        setWorkerError("Ce code généré existe déjà, veuillez soumettre à nouveau pour générer d'autres chiffres.");
      } else {
        setWorkerError(`Impossible de créer le sous-compte: ${err.message || err}`);
      }
    } finally {
      setIsCreatingWorker(false);
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

                {/* Séparateur élégant pour l'accès collaborateur */}
                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest font-sans">
                      Ou Accès Collaborateur / Intervenant
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
                      Saisir Code Unique (7 caractères)
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        maxLength={7}
                        value={workerLoginCodeInput}
                        onChange={(e) => setWorkerLoginCodeInput(e.target.value.toUpperCase())}
                        placeholder="Ex: DAVI581"
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono font-bold tracking-widest text-slate-800 placeholder-slate-400 uppercase outline-none transition-all"
                      />
                    </div>
                  </div>

                  {workerLoginError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-150 text-rose-800 rounded-xl text-[11px] font-medium font-sans text-left leading-relaxed">
                      {workerLoginError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleWorkerLogin}
                    disabled={isLoadingSpace}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    {isLoadingSpace && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Connexion avec mon Code</span>
                  </button>
                </div>
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
                          : "text-slate-500 hover:text-slate-800"
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
                          : "text-slate-500 hover:text-slate-800"
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

            <div className="text-[10px] text-slate-400 text-center leading-relaxed pt-2.5 mt-4 border-t border-slate-100">
              En vous inscrivant ou vous connectant, vous acceptez l'{" "}
              <button
                type="button"
                onClick={() => {
                  setTermsDefaultTab("concierge");
                  setIsTermsOpen(true);
                }}
                className="text-blue-600 hover:underline font-semibold cursor-pointer inline"
              >
                Accord Concierge "Espace"
              </button>{" "}
              et les{" "}
              <button
                type="button"
                onClick={() => {
                  setTermsDefaultTab("guest");
                  setIsTermsOpen(true);
                }}
                className="text-blue-600 hover:underline font-semibold cursor-pointer inline"
              >
                Conditions Générales Voyageurs
              </button>.
            </div>

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
                onClick={async () => {
                  localStorage.removeItem("spaceone_current_owner");
                  localStorage.removeItem("spaceone_custom_user");
                  try {
                    await signOut(auth);
                  } catch (e) {
                    console.warn("SignOut failed or bypassed:", e);
                  }
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
          
          {currentUser?.role !== "worker" && currentUser?.role !== "admin" && (
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
          )}

          {currentUser?.role !== "worker" && currentUser?.role !== "admin" && (
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
          )}

          {currentUser?.role !== "worker" && currentUser?.role !== "admin" && (
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
          )}

          {(currentUser?.role === "worker" || (currentUser?.role === "espace" && currentUser?.isCleaningAllowed !== false)) && currentUser?.role !== "admin" && (
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
              <div className="flex-grow text-left">
                {currentUser?.role === "worker" ? "Mon Espace de Nettoyage" : "Tâches de Ménage"}
              </div>
              {currentUser?.role === "espace" && currentUser?.isCleaningAllowed === false ? (
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  activeTab === "cleaning"
                    ? "bg-amber-500 text-white"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {currentUser?.isCleaningAccessRequested ? "En cours" : "Premium"}
                </span>
              ) : pendingTurnoversCount > 0 ? (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === "cleaning" ? "bg-blue-500 text-white/90" : "bg-red-50 text-red-600 font-mono"
                }`}>
                  {pendingTurnoversCount}
                </span>
              ) : null}
            </button>
          )}

          {currentUser?.role !== "worker" && currentUser?.role !== "admin" && (
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
          )}

          {currentUser?.role === "espace" && currentUser?.role !== "admin" && (
            <button
              onClick={() => {
                setActiveTab("team");
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold font-sans transition-all cursor-pointer ${
                activeTab === "team"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Users className={`w-4 h-4 ${activeTab === "team" ? "text-white" : "text-slate-400"}`} />
              <div className="flex-grow text-left">Mon Équipe</div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "team" ? "bg-blue-500 text-white/90" : "bg-slate-100 text-slate-500 font-mono"
              }`}>
                {allUsers.filter((u) => u.role === "worker" && (currentUser.role === "admin" || u.parentId === currentUser.id)).length}
              </span>
            </button>
          )}

          {currentUser?.role === "admin" && (
            <button
              onClick={() => {
                setActiveTab("admin");
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold font-sans transition-all cursor-pointer ${
                activeTab === "admin"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <ShieldAlert className={`w-4 h-4 ${activeTab === "admin" ? "text-white" : "text-slate-400"}`} />
              <div className="flex-grow text-left">Administration</div>
            </button>
          )}
        </nav>

        {/* Slide Menu Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
          <div className="space-y-1">
            <button
              onClick={() => {
                setTermsDefaultTab("concierge");
                setIsTermsOpen(true);
              }}
              className="text-[10px] text-blue-600 hover:underline font-semibold block text-left last-of-type:border-b-0 cursor-pointer"
            >
              • Accord Concierge "Espace"
            </button>
            <button
              onClick={() => {
                setTermsDefaultTab("guest");
                setIsTermsOpen(true);
              }}
              className="text-[10px] text-blue-600 hover:underline font-semibold block text-left cursor-pointer"
            >
              • Politique Voyageurs & RGPD
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-sans">
            © 2026 SpaceOne SAS. Tous droits réservés. Securisé.
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
                  
                  {/* Share Space direct link & Manage Team button */}
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

                    {(currentUser?.role === "espace" || currentUser?.role === "admin") && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("team")}
                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-sans font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md border border-white/10 active:scale-97"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <span>Gérer mon Équipe (Collaborateurs) 👥</span>
                      </button>
                    )}
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
          currentUser?.role === "espace" && currentUser?.isCleaningAllowed === false ? (
            <CleaningUpgradeRequestView
              currentUser={currentUser}
              onSendRequest={handleRequestCleaningAccess}
            />
          ) : (
            <CleaningTab
              cleaningTasks={cleaningTasks}
              apartments={apartments}
              onAddCleaningTask={handleAddCleaningTask}
              onUpdateCleaningTask={handleUpdateCleaningTask}
              onDeleteCleaningTask={handleDeleteCleaningTask}
              workers={allUsers.filter((u) => u.role === "worker")}
              currentUser={currentUser}
            />
          )
        )}

        {activeTab === "chat" && (
          <CommunicationTab
            threads={threads}
            bookings={bookings}
            onAddMessage={handleAddMessage}
          />
        )}

        {activeTab === "team" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 font-sans">
                Mon Équipe & Collaborateurs
              </h2>
              <p className="text-sm text-slate-500 font-sans mt-0.5">
                Gérez les sous-comptes pour vos agents de nettoyage et techniciens partenaires. Suivez l'avancée de leurs tâches de ménage en temps réel.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Formulaire de création */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans border-b border-slate-100 pb-2">
                  Enregistrer un Collaborateur
                </h3>
                
                <form onSubmit={handleCreateWorkerSubmit} className="space-y-4">
                  {workerError && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold leading-relaxed border border-red-150">
                      {workerError}
                    </div>
                  )}
                  {workerSuccess && (
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold leading-relaxed border border-emerald-150">
                      {workerSuccess}
                    </div>
                  )}

                   <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-sans">
                        Prénom *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: David"
                        value={workerFirstName}
                        onChange={(e) => setWorkerFirstName(e.target.value)}
                        className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-hidden focus:border-slate-400 font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-sans">
                        Nom de famille *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Berger"
                        value={workerLastName}
                        onChange={(e) => setWorkerLastName(e.target.value)}
                        className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-hidden focus:border-slate-400 font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-sans">
                      Numéro de contact (Téléphone) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: +33 6 12 34 56 78"
                      value={workerPhone}
                      onChange={(e) => setWorkerPhone(e.target.value)}
                      className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-hidden focus:border-slate-400 font-sans"
                    />
                  </div>

                  {/* Live generated login code preview */}
                  {(workerFirstName || workerLastName) && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
                      <span className="block text-[9px] font-black uppercase text-blue-500 tracking-wider font-sans">
                        Aperçu du code de connexion (7 caractères)
                      </span>
                      <p className="text-sm font-extrabold font-mono text-blue-950 uppercase tracking-widest">
                        {(() => {
                          const f = workerFirstName.replace(/[^a-zA-Z]/g, "").toLowerCase();
                          const l = workerLastName.replace(/[^a-zA-Z]/g, "").toLowerCase();
                          const combo = f + l;
                          let px = combo.substring(0, 4);
                          if (px.length < 3) px = (px + "col").substring(0, 3);
                          const rem = 7 - px.length;
                          return px + "•••••••".substring(0, rem);
                        })()}
                      </p>
                      <span className="block text-[9px] text-blue-400 font-sans leading-tight">
                        Uniquement d'après leur nom et des chiffres générés de manière unique. Aucun mot de passe requis.
                      </span>
                    </div>
                  )}

                  {currentUser.role === "admin" && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-sans">
                        Rattacher à la Conciergerie *
                      </label>
                      <select
                        required
                        value={newWorkerParentId}
                        onChange={(e) => setNewWorkerParentId(e.target.value)}
                        className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-hidden focus:border-slate-400 font-sans cursor-pointer"
                      >
                        <option value="">-- Choisir une conciergerie --</option>
                        {allUsers
                          .filter((u) => u.role === "espace")
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.businessName} ({u.fullName})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isCreatingWorker}
                    className="w-full text-center bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 text-xs font-bold font-sans uppercase tracking-wider cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isCreatingWorker ? "Création en cours..." : "Créer le sous-compte"}
                  </button>
                </form>
              </div>

              {/* Liste des collaborateurs */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans border-b border-slate-100 pb-2 mb-4">
                    Collaborateurs Enregistrés ({allUsers.filter(u => u.role === "worker" && (currentUser.role === "admin" || u.parentId === currentUser.id)).length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allUsers
                      .filter((u) => u.role === "worker" && (currentUser.role === "admin" || u.parentId === currentUser.id))
                      .map((worker) => {
                        const workerTasks = cleaningTasks.filter((t) => t.cleanerId === worker.id);
                        const assignedPending = workerTasks.filter((t) => t.status !== "completed").length;

                        return (
                          <div key={worker.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0 font-sans">
                                {worker.fullName ? worker.fullName.split(" ").map(n => n[0]).join("") : "T"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-slate-800 truncate">{worker.fullName}</h4>
                                <p className="text-[10px] text-slate-400 font-mono truncate">{worker.email}</p>
                                {currentUser.role === "admin" && (
                                  <p className="text-[9px] text-blue-600 font-semibold uppercase tracking-wider truncate mt-0.5">
                                    Conciergerie : {worker.businessName}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="p-2.5 bg-white rounded-lg border border-slate-100 space-y-1.5 font-sans">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-400">Tâches assignées</span>
                                <span className="font-bold text-slate-700 font-mono">{workerTasks.length} total</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-400">En cours / En attente</span>
                                <span className="font-extrabold text-blue-600 font-mono">{assignedPending} en cours</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-50">
                                <span className="text-slate-400">Téléphone</span>
                                <span className="font-mono text-slate-800 font-semibold">{worker.phone || "Non renseigné"}</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] pt-1">
                                <span className="text-slate-400">Code de Connexion</span>
                                <span className="font-mono font-black bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] select-all animate-pulse tracking-wider">
                                  {(worker.loginCode || "").toUpperCase() || "N/A"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm">
                                Compte Actif
                              </span>
                              <button
                                onClick={() => {
                                  if (confirm(`Êtes-vous certain de vouloir supprimer le sous-compte de ${worker.fullName} ?`)) {
                                    handleDeleteUser(worker.id);
                                  }
                                }}
                                className="text-[10px] font-bold text-red-500 hover:text-red-700 font-sans cursor-pointer transition-colors"
                              >
                                Supprimer le sous-compte
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {allUsers.filter(u => u.role === "worker" && (currentUser.role === "admin" || u.parentId === currentUser.id)).length === 0 && (
                      <div className="col-span-full py-8 text-center text-slate-400 text-xs font-sans">
                        Aucun collaborateur enregistré pour le moment.
                        <br />
                        Utilisez le formulaire ci-contre pour créer votre premier compte de ménage.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "admin" && currentUser.role === "admin" && (
          <div className="space-y-6 animate-fade-in mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 font-sans">
                  Portail d'Administration Global
                </h2>
                <p className="text-sm text-slate-500 font-sans mt-0.5">
                  Gérez les validations d'accès business, surveillez les flux de réservations de luxe et pilotez les équipes d'entretien.
                </p>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-3 py-1.5 rounded-xl font-sans shrink-0 block shadow-xs border border-white/5">
                Autorité Administration active
              </div>
            </div>

            {/* KPI Cards section for very professional feel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-2xs flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Établissements Actifs</span>
                  <div className="text-2xl font-black text-slate-800 font-sans">
                    {allUsers.filter(u => u.role === "espace" && u.approved).length} <span className="text-xs font-normal text-slate-400">/ {allUsers.filter(u => u.role === "espace").length}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-2xs flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Parc Immobilier Global</span>
                  <div className="text-2xl font-black text-slate-800 font-sans">{apartments.length}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-2xs flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Volume de Transactions</span>
                  <div className="text-2xl font-black text-emerald-600 font-sans">
                    {bookings.filter(b => b.status !== "cancelled").reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString("fr-FR")} €
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-2xs flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Demandes en attente</span>
                  <div className="text-2xl font-black text-amber-600 font-sans">
                    {allUsers.filter(u => u.role === "espace" && !u.approved).length + allUsers.filter(u => u.role === "espace" && u.isCleaningAccessRequested).length}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Sélecteur de sous-onglet administration */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl max-w-lg shadow-inner">
              <button
                onClick={() => setAdminSubTab("users")}
                className={`flex-1 text-center py-2 text-xs font-bold font-sans rounded-lg tracking-wide uppercase transition-all cursor-pointer ${
                  adminSubTab === "users" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Validation Concierges ({allUsers.filter(u => u.role === "espace").length})
              </button>
              <button
                onClick={() => setAdminSubTab("bookings")}
                className={`flex-1 text-center py-2 text-xs font-bold font-sans rounded-lg tracking-wide uppercase transition-all cursor-pointer ${
                  adminSubTab === "bookings" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Réservations Concierges ({bookings.length})
              </button>
              <button
                onClick={() => setAdminSubTab("workers")}
                className={`flex-1 text-center py-2 text-xs font-bold font-sans rounded-lg tracking-wide uppercase transition-all cursor-pointer ${
                  adminSubTab === "workers" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sous-comptes Équipes ({allUsers.filter(u => u.role === "worker").length})
              </button>
            </div>

            {/* Contenu Sous-onglets */}
            {adminSubTab === "users" && (
              <div className="space-y-6">
                {/* Demandes de ménage actives */}
                {allUsers.some((u) => u.role === "espace" && u.isCleaningAccessRequested) && (
                  <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/40 border border-amber-200 rounded-2xl p-5 space-y-4 shadow-xs animate-fade-in">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Wrench className="w-4 h-4 text-amber-600 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest font-sans">
                          Demandes Actives d'Accès Tâches de Ménage
                        </h4>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                          Ces partenaires Concierges demandent l'activation du module complet de turnovers de ménage.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      {allUsers
                        .filter((u) => u.role === "espace" && u.isCleaningAccessRequested)
                        .map((reqUser) => {
                          const reqDate = reqUser.cleaningAccessRequestedAt
                            ? new Date(reqUser.cleaningAccessRequestedAt).toLocaleString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Date-Inconnue";
                          return (
                            <div
                              key={reqUser.id}
                              className="bg-white border border-amber-150/70 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs"
                            >
                              <div className="space-y-1.5 text-xs text-slate-600 font-sans flex-grow">
                                <button
                                  onClick={() => setSelectedConciergeId(reqUser.id)}
                                  className="text-sm font-black text-slate-900 group flex flex-wrap items-center gap-2 hover:underline text-left cursor-pointer"
                                >
                                  <span className="text-blue-650 group-hover:text-blue-800">{reqUser.businessName}</span>
                                  <span className="text-[9px] bg-amber-100/60 text-amber-800 border border-amber-150 px-2 py-0.5 rounded-full font-bold">
                                    Demandé le {reqDate}
                                  </span>
                                </button>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 mt-0.5">
                                  <div>
                                    Gérant / Directeur :{" "}
                                    <span className="font-semibold text-slate-850">
                                      {reqUser.fullName}
                                    </span>
                                  </div>
                                  <div>
                                    Email de liaison :{" "}
                                    <span className="font-semibold text-slate-850 font-mono">
                                      {reqUser.email}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 w-full md:w-auto">
                                <button
                                  onClick={() => handleToggleUserCleaning(reqUser)}
                                  className="w-full md:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow-xs transition-colors"
                                >
                                  Activer & Valider (Tarif 10%)
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Inspecteur de Concierge en détail */}
                {(() => {
                  const selectedUser = allUsers.find(u => u.id === selectedConciergeId);
                  if (!selectedUser) return null;
                  
                  // Get statistics for the selected Concierge
                  const conciergeApts = apartments.filter(a => a.ownerId === selectedUser.id);
                  const conciergeBookings = bookings.filter(b => conciergeApts.some(a => a.id === b.apartmentId));
                  const conciergeWorkers = allUsers.filter(u => u.role === "worker" && u.parentId === selectedUser.id);
                  const totalBookingsAmount = conciergeBookings
                    .filter(b => b.status !== "cancelled")
                    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

                  return (
                    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-6 animate-fade-in relative overflow-hidden">
                      <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                      
                      {/* Close button & Title */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider font-mono">Dossier Inspecteur Partenaire</div>
                          <h3 className="text-xl font-black tracking-tight">{selectedUser.businessName}</h3>
                        </div>
                        <button
                          onClick={() => setSelectedConciergeId(null)}
                          className="p-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Masquer [X]
                        </button>
                      </div>

                      {/* Info and stats grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Column 1: Core Details */}
                        <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3.5">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono border-b border-slate-800 pb-1.5">Identité Établissement</h4>
                          
                          <div className="space-y-2.5 text-xs text-slate-300 font-sans">
                            <div>
                              <div className="text-[9px] text-slate-400 font-mono">Directeur de compte</div>
                              <div className="font-bold text-slate-100">{selectedUser.fullName}</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-400 font-mono">Mail de liaison</div>
                              <div className="font-mono text-blue-300 underline font-semibold">{selectedUser.email}</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-400 font-mono">Inscrit le</div>
                              <div>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-400 font-mono">Frais de commission d'origine</div>
                              <div className="font-bold text-amber-400">
                                {selectedUser.isCleaningAllowed !== false ? "10% commission (Module ménage inclus)" : "8% commission standard"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Column 2: Core aggregates */}
                        <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-4">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono border-b border-slate-800 pb-1.5">Activité Générée</h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Logements</span>
                              <div className="text-xl font-black text-slate-100">{conciergeApts.length}</div>
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Réservations</span>
                              <div className="text-xl font-black text-slate-100">{conciergeBookings.length}</div>
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Équipes terrain</span>
                              <div className="text-xl font-black text-slate-100">{conciergeWorkers.length}</div>
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Flux financier</span>
                              <div className="text-sm font-bold text-emerald-400">{totalBookingsAmount.toLocaleString("fr-FR")} €</div>
                            </div>
                          </div>
                        </div>

                        {/* Column 3: Control Center */}
                        <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3.5 flex flex-col justify-between">
                          <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono border-b border-slate-800 pb-1.5">Centre de Commande</h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-2">
                              Pilotez les autorisations d'accès instantanément pour modifier son contrat ou suspendre ses droits sur l'application.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2">
                            <button
                              onClick={() => handleToggleUserApproval(selectedUser)}
                              className={`py-2 px-3 rounded-xl transition-colors font-sans cursor-pointer uppercase text-[9px] tracking-wider font-extrabold ${
                                selectedUser.approved
                                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              }`}
                            >
                              {selectedUser.approved ? "Invalider" : "Valider"}
                            </button>
                            
                            <button
                              onClick={() => handleToggleUserSuspension(selectedUser)}
                              className={`py-2 px-3 rounded-xl transition-colors font-sans cursor-pointer uppercase text-[9px] tracking-wider font-extrabold ${
                                selectedUser.suspended
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-red-900/55 text-red-150 hover:bg-red-900"
                              }`}
                            >
                              {selectedUser.suspended ? "Activer" : "Suspendre"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Detail lists */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                        {/* Left Sub-column: Apartments associated */}
                        <div className="space-y-3">
                          <h5 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider font-sans border-b border-slate-800 pb-1">
                            Logements de la Conciergerie ({conciergeApts.length})
                          </h5>
                          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                            {conciergeApts.map(apt => (
                              <div key={apt.id} className="bg-slate-850 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                                <img
                                  src={apt.thumbnail || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=300&q=80"}
                                  alt={apt.name}
                                  className="w-12 h-12 object-cover rounded-lg shrink-0 border border-slate-800"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex-grow min-w-0 text-xs">
                                  <div className="font-extrabold text-slate-100 truncate">{apt.name}</div>
                                  <div className="text-slate-400 truncate text-[10px] font-sans">{apt.address}</div>
                                  <div className="text-[9px] font-mono text-blue-400 mt-0.5">
                                    {apt.rooms} pièces • {apt.beds} lits • Tarif: {apt.pricePerNight || 0} €/nuit
                                  </div>
                                </div>
                                <span className={`text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                  apt.status === "occupied" ? "bg-red-500/20 text-red-300 border border-red-500/20" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                                }`}>
                                  {apt.status === "occupied" ? "Occupé" : "Libre"}
                                </span>
                              </div>
                            ))}
                            {conciergeApts.length === 0 && (
                              <div className="text-center py-6 text-slate-500 text-xs font-sans">
                                Aucun logement enregistré pour le moment.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Sub-column: Bookings associated */}
                        <div className="space-y-3">
                          <h5 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider font-sans border-b border-slate-800 pb-1">
                            Historique des Réservations ({conciergeBookings.length})
                          </h5>
                          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                            {conciergeBookings.map(b => {
                              const apt = conciergeApts.find(a => a.id === b.apartmentId);
                              return (
                                <div key={b.id} className="bg-slate-850 border border-slate-800 p-3 rounded-xl flex flex-col text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="font-extrabold text-slate-100">{b.guestName}</div>
                                    <div className="font-mono text-emerald-400 font-bold">{b.totalAmount || 0} €</div>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    Hébergement: <span className="text-slate-200 font-semibold">{apt ? apt.name : "Hébergement"}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 font-mono">
                                    <span>Du {b.checkIn || b.startDate} au {b.checkOut || b.endDate}</span>
                                    <span className="uppercase font-bold text-slate-300">{b.status}</span>
                                  </div>
                                </div>
                              );
                            })}
                            {conciergeBookings.length === 0 && (
                              <div className="text-center py-6 text-slate-500 text-xs font-sans">
                                Aucune réservation enregistrée pour le moment.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
                      Validation & Droits des Établissements Concierges
                    </h3>
                    
                    {/* Search Field */}
                    <div className="relative w-full sm:w-72">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-slate-450" />
                      </div>
                      <input
                        type="text"
                        placeholder="Rechercher un établissement..."
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        className="block w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 rounded-xl text-xs font-sans transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto min-w-full">
                    <table className="min-w-full divide-y divide-slate-100 font-sans">
                      <thead>
                        <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                          <th className="px-4 py-3">Établissement</th>
                          <th className="px-4 py-3">Gérant / Contact</th>
                          <th className="px-4 py-3">Inscrit le</th>
                          <th className="px-4 py-3 text-center">Accès Ménages (Tâches)</th>
                          <th className="px-4 py-3 text-center">Statut Business</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/40">
                              <td className="px-4 py-3.5">
                                <button
                                  onClick={() => setSelectedConciergeId(user.id)}
                                  className="hover:underline cursor-pointer text-blue-650 hover:text-blue-800 font-bold font-sans text-left flex items-center gap-1.5 transition-all outline-none"
                                  title="Inspecter en détail"
                                >
                                  <Building className="w-3.5 h-3.5 text-blue-500" />
                                  <span>{user.businessName}</span>
                                </button>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="font-semibold text-slate-700">{user.fullName}</div>
                                <div className="text-[10px] text-slate-450 font-mono">{user.email}</div>
                              </td>
                              <td className="px-4 py-3.5 text-slate-500 font-mono">
                                {user.createdAt ? user.createdAt.substring(0, 10) : "Par défaut"}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <button
                                    onClick={() => handleToggleUserCleaning(user)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-colors ${
                                      user.isCleaningAllowed !== false
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-150 hover:bg-emerald-100"
                                        : "bg-amber-50 text-amber-800 border-amber-150 hover:bg-amber-100"
                                    }`}
                                  >
                                    {user.isCleaningAllowed !== false ? "Autorisé" : "Interdit"}
                                  </button>
                                  {user.isCleaningAccessRequested && (
                                    <span className="text-[8px] text-amber-700 bg-amber-50 border border-amber-150 rounded px-1 py-0.5 animate-pulse uppercase tracking-wider font-extrabold">
                                      Demande: Tarif 10%
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                  user.approved
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-red-50 text-red-650 animate-pulse"
                                }`}>
                                  {user.approved ? "Validé" : "En cours..."}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right space-x-1">
                                <button
                                  onClick={() => handleToggleUserApproval(user)}
                                  className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                    user.approved
                                      ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                      : "bg-blue-600 hover:bg-blue-700 text-white"
                                  }`}
                                >
                                  {user.approved ? "Invalider" : "Valider"}
                                </button>
                                
                                <button
                                  onClick={() => handleToggleUserSuspension(user)}
                                  className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                    user.suspended
                                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                      : "bg-rose-50 hover:bg-rose-100 text-rose-600"
                                  }`}
                                >
                                  {user.suspended ? "Activer" : "Suspendre"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        {filteredUsers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-slate-400">
                              Aucun établissement ne correspond à votre recherche.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {adminSubTab === "bookings" && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans border-b border-slate-100 pb-2">
                  Suivi des Réservations Prestiges
                </h3>
                
                <div className="overflow-x-auto min-w-full">
                  <table className="min-w-full divide-y divide-slate-100 font-sans">
                    <thead>
                      <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                        <th className="px-4 py-3">Hébergement</th>
                        <th className="px-4 py-3">Locataire</th>
                        <th className="px-4 py-3">Hôte (Concierge d'origine)</th>
                        <th className="px-4 py-3">Dates de séjour</th>
                        <th className="px-4 py-3 text-center">Montant Global</th>
                        <th className="px-4 py-3 text-center">Statut Réservation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {bookings.map((booking) => {
                        const apt = apartments.find((a) => a.id === booking.apartmentId);
                        const conciergeUser = allUsers.find((u) => u.id === (apt?.ownerId || booking.hostId));

                        return (
                          <tr key={booking.id} className="hover:bg-slate-50/40">
                            <td className="px-4 py-3.5 font-bold text-slate-800">
                              {apt ? apt.name : "Hébergement"}
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-slate-700">
                              {booking.guestName}
                            </td>
                            <td className="px-4 py-3.5">
                              {conciergeUser ? (
                                <div>
                                  <div className="font-bold text-slate-700">{conciergeUser.businessName}</div>
                                  <div className="text-[9px] text-slate-400 font-sans">{conciergeUser.fullName}</div>
                                </div>
                              ) : (
                                <span className="text-slate-400">Inconnu</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-500">
                              Du {booking.startDate} Au {booking.endDate}
                            </td>
                            <td className="px-4 py-3.5 text-center font-bold font-mono text-emerald-600">
                              {(booking.totalAmount || 0).toLocaleString("fr-FR")} €
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                booking.status === "confirmed"
                                  ? "bg-slate-900 text-white"
                                  : booking.status === "completed"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-red-50 text-red-650"
                              }`}>
                                {booking.status === "confirmed" ? "Payé / Confirmé" : booking.status === "completed" ? "Terminé" : "Annulé"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {bookings.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            Aucune réservation n'a encore été enregistrée dans le système.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminSubTab === "workers" && (
              <div className="space-y-6">
                {/* Re-use Team layout for consolidated worker creation as admin! */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Form */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans border-b border-slate-100 pb-2">
                      Créer un sous-compte
                    </h3>
                    
                    <form onSubmit={handleCreateWorkerSubmit} className="space-y-4 font-sans">
                      {workerError && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold leading-relaxed border border-red-150">
                          {workerError}
                        </div>
                      )}
                      {workerSuccess && (
                        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold leading-relaxed border border-emerald-150">
                          {workerSuccess}
                        </div>
                      )}

                       <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-sans">
                            Prénom *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: David"
                            value={workerFirstName}
                            onChange={(e) => setWorkerFirstName(e.target.value)}
                            className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-hidden focus:border-slate-400 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-sans">
                            Nom de famille *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Berger"
                            value={workerLastName}
                            onChange={(e) => setWorkerLastName(e.target.value)}
                            className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-hidden focus:border-slate-400 font-sans"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-sans">
                          Numéro de contact (Téléphone) *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="Ex: +33 6 12 34 56 78"
                          value={workerPhone}
                          onChange={(e) => setWorkerPhone(e.target.value)}
                          className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-hidden focus:border-slate-400 font-sans"
                        />
                      </div>

                      {/* Live generated login code preview */}
                      {(workerFirstName || workerLastName) && (
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
                          <span className="block text-[9px] font-black uppercase text-blue-500 tracking-wider font-sans">
                            Aperçu du code de connexion (7 caractères)
                          </span>
                          <p className="text-sm font-extrabold font-mono text-blue-950 uppercase tracking-widest">
                            {(() => {
                              const f = workerFirstName.replace(/[^a-zA-Z]/g, "").toLowerCase();
                              const l = workerLastName.replace(/[^a-zA-Z]/g, "").toLowerCase();
                              const combo = f + l;
                              let px = combo.substring(0, 4);
                              if (px.length < 3) px = (px + "col").substring(0, 3);
                              const rem = 7 - px.length;
                              return px + "•••••••".substring(0, rem);
                            })()}
                          </p>
                          <span className="block text-[9px] text-blue-400 font-sans leading-tight">
                            Uniquement d'après leur nom et des chiffres générés de manière unique. Aucun mot de passe requis.
                          </span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-sans">
                          Rattacher à la Conciergerie *
                        </label>
                        <select
                          required
                          value={newWorkerParentId}
                          onChange={(e) => setNewWorkerParentId(e.target.value)}
                          className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-hidden focus:border-slate-400 font-sans cursor-pointer"
                        >
                          <option value="">-- Choisir une conciergerie --</option>
                          {allUsers
                            .filter((u) => u.role === "espace")
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.businessName} ({u.fullName})
                              </option>
                            ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isCreatingWorker}
                        className="w-full text-center bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 text-xs font-bold font-sans uppercase tracking-wider cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                      >
                        {isCreatingWorker ? "Création en cours..." : "Créer le sous-compte"}
                      </button>
                    </form>
                  </div>

                  {/* Right side list */}
                  <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans border-b border-slate-100 pb-2 mb-4">
                      Tous les Techniciens & Travailleurs de la Plateforme ({allUsers.filter(u => u.role === "worker").length})
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allUsers
                        .filter((u) => u.role === "worker")
                        .map((worker) => {
                          const parent = allUsers.find((p) => p.id === worker.parentId);
                          return (
                            <div key={worker.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between space-y-3 font-sans">
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0 font-sans">
                                  {worker.fullName ? worker.fullName.split(" ").map(n => n[0]).join("") : "T"}
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                  <h4 className="text-xs font-bold text-slate-800 truncate">{worker.fullName}</h4>
                                  <p className="text-[10px] text-slate-400 font-mono truncate">{worker.email}</p>
                                  <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider truncate mt-0.5">
                                    Conciergerie : {worker.businessName || parent?.businessName || "Espace Premium"}
                                  </p>
                                </div>
                              </div>

                              <div className="p-2.5 bg-white rounded-lg border border-slate-100 text-[10px] space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Identifiant d'accès</span>
                                  <span className="font-mono text-slate-600 font-bold text-[9px]">{worker.email}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-slate-50">
                                  <span className="text-slate-400">Mot de passe fourni</span>
                                  <span className="font-mono text-slate-700 bg-slate-150 px-1 py-0.5 rounded text-[8px] font-bold select-all">
                                    {worker.password || "Standard"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm">
                                  Accès actif
                                </span>
                                <button
                                  onClick={() => {
                                    if (confirm(`Voulez-vous supprimer définitivement le sous-compte de ${worker.fullName} ?`)) {
                                      handleDeleteUser(worker.id);
                                    }
                                  }}
                                  className="text-[10px] font-bold text-red-500 hover:text-red-700 font-sans cursor-pointer transition-colors"
                                >
                                  Supprimer le sous-compte
                                </button>
                              </div>
                            </div>
                          );
                        })}

                      {allUsers.filter(u => u.role === "worker").length === 0 && (
                        <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                          Aucun sous-compte travailleur n'a été créé sur la plateforme.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        defaultTab={termsDefaultTab}
      />
    </div>
  );
}
