import { Apartment, Booking, CleaningTask, MessageThread } from "./types";

export const initialApartments: Apartment[] = [
  {
    id: "apt-1",
    name: "La Suite Prestige SpaceOne",
    address: "24 Rue de Rivoli, 75001 Paris",
    rooms: 2,
    beds: 3,
    maxGuests: 4,
    status: "occupied", // active booking today
    thumbnail: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80"
    ],
    details: "Un chef-d'œuvre de design contemporain niché au cœur du Marais. Offre une vue spectaculaire sur l'architecture parisienne classique, climatisation intégrée, cuisine tout équipée de marque haut de gamme et service de conciergerie disponible 24/7."
  },
  {
    id: "apt-2",
    name: "Le Loft Coucher de Soleil",
    address: "108 Boulevard de la Croisette, 06400 Cannes",
    rooms: 1,
    beds: 1,
    maxGuests: 2,
    status: "scheduled", // upcoming booking next week
    thumbnail: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
    ],
    details: "Superbe duplex lumineux surplombant directement la mer Méditerranée. Équipé d'une spacieuse terrasse privée parfaite pour les fins de journées ensoleillées, de finitions raffinées en marbre et d'un accès privé direct à la plage."
  },
  {
    id: "apt-3",
    name: "Le Chalet des Sommets - SpaceOne",
    address: "410 Chemin du Sommet, 74400 Chamonix",
    rooms: 3,
    beds: 5,
    maxGuests: 8,
    status: "free", // recently checked out, currently free
    thumbnail: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
    ],
    details: "Chalet d'exception entièrement en bois brut doté de tout le confort alpin moderne. Comprend une grande cheminée centrale suspendue en acier pour les soirées rudes, un espace bien-être privatif avec hammam, et une vue panoramique époustouflante sur le Mont Blanc."
  }
];

export const initialBookings: Booking[] = [
  {
    id: "book-1",
    apartmentId: "apt-1",
    guestName: "Delphine Mercier",
    guestEmail: "delphine.m@example.com",
    guestPhone: "+33 6 12 34 56 78",
    checkIn: "2026-05-25",
    checkOut: "2026-05-30",
    guestsCount: 2,
    totalAmount: 750,
    status: "active",
    notes: "Célèbre son anniversaire de mariage. Demande des serviettes supplémentaires."
  },
  {
    id: "book-2",
    apartmentId: "apt-2",
    guestName: "Marc-André Moreau",
    guestEmail: "mamoreau@example.com",
    guestPhone: "+33 7 98 76 54 32",
    checkIn: "2026-06-02",
    checkOut: "2026-06-08",
    guestsCount: 2,
    totalAmount: 960,
    status: "upcoming",
    notes: "Souhaite obtenir les instructions de stationnement détaillées."
  },
  {
    id: "book-3",
    apartmentId: "apt-3",
    guestName: "Famille Roussel",
    guestEmail: "roussel.famille@example.com",
    guestPhone: "+33 4 56 78 90 12",
    checkIn: "2026-05-20",
    checkOut: "2026-05-26",
    guestsCount: 6,
    totalAmount: 1400,
    status: "completed",
    notes: "Clients extrêmement propres. Ont voyagé avec 2 enfants."
  },
  {
    id: "book-4",
    apartmentId: "apt-3",
    guestName: "Émilie Dubois",
    guestEmail: "emilie.dubois@example.com",
    guestPhone: "+33 6 34 56 78 90",
    checkIn: "2026-06-12",
    checkOut: "2026-06-16",
    guestsCount: 1,
    totalAmount: 850,
    status: "upcoming",
    notes: "Voyage professionnel pour une conférence."
  }
];

export const initialCleaningTasks: CleaningTask[] = [
  {
    id: "clean-1",
    apartmentId: "apt-3",
    bookingId: "book-3",
    date: "2026-05-26",
    status: "completed",
    cleanerName: "Pierre Legrand",
    notes: "Chalet nettoyé de fond en comble. Jacuzzi désinfecté et filtre changé.",
    checklist: [
      { id: "c1-1", text: "Retirer les draps et laver les serviettes", done: true },
      { id: "c1-2", text: "Désinfecter la cuisine, nettoyer micro-ondes & frigo", done: true },
      { id: "c1-3", text: "Balayer et passer l'aspirateur sur les parquets en chêne", done: true },
      { id: "c1-4", text: "Vérifier la terrasse et désinfecter le jacuzzi", done: true },
      { id: "c1-5", text: "Réinitialiser le code de la boîte à clés", done: true }
    ]
  },
  {
    id: "clean-2",
    apartmentId: "apt-1",
    bookingId: "book-1",
    date: "2026-05-30",
    status: "pending",
    cleanerName: "Amélie Dubois",
    notes: "Delphine a demandé un départ en fin de matinée. Nettoyage à partir de 11h30 précises.",
    checklist: [
      { id: "c2-1", text: "Retirer les draps de lit, vérifier l'absence de doublons de réservation", done: false },
      { id: "c2-2", text: "Vider les poubelles et nettoyer le broyeur/évier", done: false },
      { id: "c2-3", text: "Laver toute la vaisselle et refaire les lits", done: false },
      { id: "c2-4", text: "Recharger les produits de toilette & capsules de café", done: false },
      { id: "c2-5", text: "Désinfecter la salle de bain principale & vérifier la pression d'eau", done: false }
    ]
  },
  {
    id: "clean-3",
    apartmentId: "apt-2",
    bookingId: "book-2",
    date: "2026-06-02",
    status: "pending",
    cleanerName: "Amélie Dubois",
    notes: "Vérifier le dépoussiérage méticuleux et arroser les fleurs de la terrasse.",
    checklist: [
      { id: "c3-1", text: "Essuyer toutes les surfaces vitrées et miroirs", done: false },
      { id: "c3-2", text: "Disposer le panier d'accueil et le livret de bienvenue", done: false },
      { id: "c3-3", text: "Laver les sols durs à la serpillière et aspirer les tapis", done: false },
      { id: "c3-4", text: "Vérifier le bon fonctionnement du routeur Internet haut débit", done: false }
    ]
  }
];

export const initialMessageThreads: MessageThread[] = [
  {
    id: "thread-1",
    bookingId: "book-1",
    guestName: "Delphine Mercier",
    apartmentName: "La Suite Prestige SpaceOne",
    lastUpdated: "2026-05-29T10:30:00Z",
    messages: [
      {
        id: "msg-1-1",
        sender: "guest",
        text: "Bonjour ! Nous sommes bien arrivés. La suite est magnifique ! Petite question : quel est le mot de passe Wi-Fi ?",
        timestamp: "2026-05-25T15:00:00Z"
      },
      {
        id: "msg-1-2",
        sender: "host",
        text: "Bonjour Delphine ! Bienvenue ! Le Wi-Fi se nomme 'PrestigeGuest' et le mot de passe est 'rivolipassion2026'. N'hésitez pas si vous avez d'autres questions !",
        timestamp: "2026-05-25T15:05:00Z"
      },
      {
        id: "msg-1-3",
        sender: "guest",
        text: "Super, merci beaucoup ! Recommandez-vous un bon café à proximité avec une belle terrasse extérieure ?",
        timestamp: "2026-05-29T10:30:00Z"
      }
    ]
  },
  {
    id: "thread-2",
    bookingId: "book-2",
    guestName: "Marc-André Moreau",
    apartmentName: "Le Loft Coucher de Soleil",
    lastUpdated: "2026-05-28T14:30:00Z",
    messages: [
      {
        id: "msg-2-1",
        sender: "host",
        text: "Bonjour Marc-André ! Nous nous réjouissons de vous accueillir au Loft Coucher de Soleil le 2 juin prochain. N'hésitez pas à nous indiquer votre heure d'arrivée prévue.",
        timestamp: "2026-05-28T10:00:00Z"
      },
      {
        id: "msg-2-2",
        sender: "guest",
        text: "Bonjour ! Merci pour votre message. Notre vol atterrit à 14h00, nous prévoyons donc d'arriver vers 15h30. Une arrivée anticipée serait-elle envisageable ?",
        timestamp: "2026-05-28T14:30:00Z"
      }
    ]
  }
];
