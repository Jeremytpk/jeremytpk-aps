export interface Apartment {
  id: string;
  name: string;
  address: string;
  rooms: number;
  beds: number;
  maxGuests: number;
  status: "occupied" | "free" | "scheduled";
  thumbnail: string;
}

export interface Booking {
  id: string;
  apartmentId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
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
  guestName: string;
  apartmentName: string;
  lastUpdated: string;
  messages: Message[];
}
