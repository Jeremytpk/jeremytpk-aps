export interface Apartment {
  id: string;
  ownerId?: string; // Links to the HomeOwner id in Firestore
  name: string;
  address: string;
  rooms: number;
  beds: number;
  maxGuests: number;
  status: "occupied" | "free" | "scheduled";
  thumbnail: string;
  images?: string[]; // Array of 3 to 10 layout/apartment images
  details?: string;  // More details about the apartment shown below the address
  pricePerNight?: number; // Price per night defined by the owner
  discountPrice?: number; // Optional special or discounted price per night
}

export interface Booking {
  id: string;
  apartmentId: string;
  ownerId?: string; // Links to the HomeOwner id in Firestore
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestHasWhatsApp?: boolean;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guestsCount: number;
  totalAmount: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
  notes?: string;
}

export interface CleaningTask {
  id: string;
  apartmentId: string;
  bookingId: string;
  ownerId?: string; // Links to the HomeOwner id in Firestore
  date: string; // YYYY-MM-DD (typically check-out date of a booking)
  status: "pending" | "in_progress" | "completed";
  cleanerName: string;
  notes: string;
  checklist: { id: string; text: string; done: boolean }[];
}

export interface Message {
  id: string;
  sender: "host" | "guest";
  text: string;
  timestamp: string; // ISODate or legible time
}

export interface MessageThread {
  id: string;
  bookingId: string;
  ownerId?: string; // Links to the HomeOwner id in Firestore
  guestName: string;
  apartmentName: string;
  lastUpdated: string;
  messages: Message[];
}

export interface HomeOwner {
  id: string;
  email: string;
  fullName: string;
  businessName: string;
  avatarUrl?: string;
  createdAt: string;
  role: "espace" | "admin" | "personal";
  suspended?: boolean;
}
