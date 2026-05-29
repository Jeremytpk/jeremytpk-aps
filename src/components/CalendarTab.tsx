import React, { useState } from "react";
import { Apartment, Booking } from "../types";
import { Calendar, ChevronLeft, ChevronRight, Info, Check, AlertTriangle, Moon, Clock, HelpCircle } from "lucide-react";

interface CalendarTabProps {
  apartments: Apartment[];
  bookings: Booking[];
}

export default function CalendarTab({ apartments, bookings }: CalendarTabProps) {
  // Center calendar view around current date parameter from system metadata: May 29, 2026
  const baseDate = new Date("2026-05-29");
  const [viewOffset, setViewOffset] = useState(0);

  // Generate 14 days of view window based on current offset
  const getDaysArray = () => {
    const arr = [];
    for (let i = -3; i < 11; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i + viewOffset);
      arr.push(d);
    }
    return arr;
  };

  const days = getDaysArray();

  const getStatusForDay = (apartmentId: string, date: Date) => {
    const dateStr = date.toISOString().substring(0, 10);

    // Find if there is an active booking on this date
    const booking = bookings.find((b) => {
      if (b.apartmentId !== apartmentId || b.status === "cancelled") return false;
      return dateStr >= b.checkIn && dateStr <= b.checkOut;
    });

    if (!booking) {
      return { status: "free" as const, booking: null };
    }

    // Determine occupied vs scheduled based on active state or booking status
    if (booking.status === "active" || dateStr === new Date("2026-05-29").toISOString().substring(0, 10)) {
      return { status: "occupied" as const, booking };
    } else {
      return { status: "scheduled" as const, booking };
    }
  };

  const formatDateLabel = (currDate: Date) => {
    const isToday = currDate.toISOString().substring(0, 10) === "2026-05-29";
    const dayName = currDate.toLocaleDateString("fr-FR", { weekday: "short" });
    const dayNum = currDate.getDate();
    return { dayName, dayNum, isToday };
  };

  return (
    <div id="calendar-tab-container" className="space-y-6">
      {/* En-tête et Cohorte de Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 font-sans">
            Calendrier d'Occupation
          </h2>
          <p className="text-sm text-slate-500 font-sans mt-0.5">
            Suivi en temps réel de l'état d'occupation, des séjours en cours, terminés et programmés de l'Auberge.
          </p>
        </div>

        {/* Shifters de semaines */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewOffset((prev) => prev - 7)}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
            title="Semaine précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-slate-700 min-w-[140px] text-center font-sans">
            {days[0].toLocaleDateString("fr-FR", { month: "short", day: "numeric" })} –{" "}
            {days[days.length - 1].toLocaleDateString("fr-FR", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <button
            onClick={() => setViewOffset((prev) => prev + 7)}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
            title="Semaine suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Légende du Calendrier */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-wrap items-center gap-4 text-xs font-sans text-slate-600">
        <span className="font-semibold text-slate-700 mr-2">Indicateurs d'état :</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-rose-500 border border-rose-600 block shadow-xs" />
          <span>Occupé (Séjour en cours)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-amber-400 border border-amber-500 block shadow-xs" />
          <span>Réservé (Séjour à venir)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-100 border border-emerald-300 block shadow-xs" />
          <span>Libre (Prêt à l'accueil)</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-slate-400 font-mono">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Le 29 Mai 2026 est mis en valeur (Aujourd'hui)</span>
        </div>
      </div>

      {/* Vue Matricielle Calendrier */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px] divide-y divide-slate-100">
            {/* Ligne des jours */}
            <div className="grid grid-cols-15 bg-slate-50/50">
              <div className="col-span-3 p-4 font-semibold text-xs text-slate-500 uppercase tracking-wider font-sans flex items-center">
                Logement d'APS
              </div>
              {days.map((day, idx) => {
                const { dayName, dayNum, isToday } = formatDateLabel(day);
                return (
                  <div
                    key={idx}
                    className={`col-span-1 p-2 text-center flex flex-col items-center justify-center border-l border-slate-100/60 ${
                      isToday ? "bg-slate-900 text-white shadow-xs rounded-b-md" : "text-slate-700"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 font-sans">
                      {dayName}
                    </span>
                    <span className="text-sm font-semibold font-mono mt-0.5">{dayNum}</span>
                  </div>
                );
              })}
            </div>

            {/* Une ligne par hébergement */}
            {apartments.map((apt) => (
              <div key={apt.id} className="grid grid-cols-15 group hover:bg-slate-50/20 items-stretch">
                {/* Nom du logement */}
                <div className="col-span-3 p-4 flex flex-col justify-center">
                  <span className="font-semibold text-slate-800 text-sm">{apt.name}</span>
                  <span className="text-slate-400 text-xs mt-1 font-mono truncate" title={apt.address}>
                    {apt.address}
                  </span>
                </div>

                {/* Statut Journalier */}
                {days.map((day, dIdx) => {
                  const dayISO = day.toISOString().substring(0, 10);
                  const { status, booking } = getStatusForDay(apt.id, day);

                  return (
                    <div
                      key={dIdx}
                      className="col-span-1 border-l border-slate-100 p-1 flex items-center justify-center relative group/tile"
                    >
                      {status === "occupied" && booking ? (
                        <div
                          className="w-full h-full min-h-[50px] rounded-lg bg-rose-500 border border-rose-600 flex flex-col items-center justify-center text-white cursor-pointer hover:brightness-105 transition-all shadow-xs"
                          title={`Voyageur : ${booking.guestName}\nSéjour : Du ${booking.checkIn} au ${booking.checkOut}`}
                        >
                          <Moon className="w-3.5 h-3.5 animate-pulse" />
                          <span className="text-[9px] font-bold mt-1 max-w-full truncate px-1 font-sans">
                            {booking.guestName.split(" ")[0]}
                          </span>
                        </div>
                      ) : status === "scheduled" && booking ? (
                        <div
                          className="w-full h-full min-h-[50px] rounded-lg bg-amber-400 border border-amber-500 flex flex-col items-center justify-center text-slate-900 cursor-pointer hover:brightness-105 transition-all shadow-xs"
                          title={`Voyageur : ${booking.guestName}\nSéjour : Du ${booking.checkIn} au ${booking.checkOut}`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-bold mt-1 max-w-full truncate px-1 font-sans">
                            {booking.guestName.split(" ")[0]}
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-full min-h-[50px] rounded-lg bg-emerald-50/60 border border-dashed border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-3xs hover:bg-emerald-100/50 transition-colors">
                          <span className="text-[9px] font-bold font-mono">LIBRE</span>
                        </div>
                      )}

                      {/* Tooltip d'informations au survol */}
                      {booking && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-950 text-white rounded-xl p-3 shadow-lg pointer-events-none opacity-0 group-hover/tile:opacity-100 transition-opacity duration-200 z-30 space-y-1.5 text-xs font-sans">
                          <div className="font-semibold text-slate-100 border-b border-slate-800 pb-1 flex items-center justify-between">
                            <span>{booking.guestName}</span>
                            <span className="bg-slate-800 text-[10px] text-slate-300 px-1.5 py-0.5 rounded-sm">
                              {booking.status === "active" ? "En cours" : booking.status === "upcoming" ? "À venir" : booking.status === "completed" ? "Terminée" : "Annulée"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Période du séjour :</span>
                            <span className="font-semibold">Du {booking.checkIn} au {booking.checkOut}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Total Séjour :</span>
                            <span className="font-bold text-amber-400 block">{booking.totalAmount} €</span>
                          </div>
                          {booking.notes && (
                            <div className="pt-1 text-[10px] text-slate-300 italic border-t border-slate-800">
                              "{booking.notes}"
                            </div>
                          )}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {apartments.length === 0 && (
              <div className="p-12 text-center text-slate-500 font-sans">
                <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-semibold">Aucun hébergement trouvé</p>
                <p className="text-sm mt-1">Veuillez d'abord enregistrer un bien pour visualiser son calendrier de réservation.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
