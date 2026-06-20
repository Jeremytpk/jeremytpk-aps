import React, { useState } from "react";
import { HomeOwner } from "../types";
import { Wrench, Sparkles, Clock, DollarSign, CheckCircle, ShieldAlert, ArrowRight } from "lucide-react";

interface CleaningUpgradeRequestViewProps {
  currentUser: HomeOwner | null;
  onSendRequest: () => Promise<void>;
}

export default function CleaningUpgradeRequestView({
  currentUser,
  onSendRequest,
}: CleaningUpgradeRequestViewProps) {
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRequestClick = async () => {
    setIsSending(true);
    setErrorMsg("");
    try {
      await onSendRequest();
    } catch (err) {
      console.error(err);
      setErrorMsg("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    } finally {
      setIsSending(false);
    }
  };

  const isAlreadyRequested = !!currentUser?.isCleaningAccessRequested;
  const requestedDateStr = currentUser?.cleaningAccessRequestedAt
    ? new Date(currentUser.cleaningAccessRequestedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-4 px-2">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 border border-slate-800/60 p-8 rounded-3xl overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-250 text-[10px] font-bold uppercase tracking-wider rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Module Premium Recommandé
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
            Optimisez vos rotations avec les Tâches de Ménage de SpaceOne
          </h2>
          <p className="text-slate-200 text-xs md:text-sm leading-relaxed font-sans font-normal">
            Un service d'exception exige une propreté irréprochable. Intégrez notre module
            de turnovers automatisés pour automatiser le travail de vos techniciens et
            garantir des check-ins d'exception.
          </p>
        </div>
      </div>

      {/* Grid of Key Features on Importance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 font-sans">Turnover Automatisé</h3>
          <p className="text-slate-500 text-xs leading-relaxed font-sans">
            Dès qu'une réservation se termine, une tâche de ménage est planifiée automatiquement 
            pour le jour du départ. Aucun battement, aucune erreur d'agenda possible.
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 font-sans">Coordination des Équipes</h3>
          <p className="text-slate-500 text-xs leading-relaxed font-sans">
            Assignez des techniciens à vos tâches, fournissez des check-lists précises par chambre 
            et suivez l'avancement "en cours" et "terminé" en temps réel.
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 font-sans">Garantie Qualité Pro</h3>
          <p className="text-slate-500 text-xs leading-relaxed font-sans">
            Chaque prestataire valide ses étapes (lin, réapprovisionnement, désinfection) 
            avec notes de terrain, offrant un historique complet à votre conciergerie.
          </p>
        </div>
      </div>

      {/* Contract & Price Box */}
      <div className="bg-slate-50 border border-slate-200/85 p-6 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-slate-800">
            <DollarSign className="w-5 h-5 text-blue-600 shrink-0" />
            <h4 className="font-bold text-sm tracking-tight font-sans">Conditions Financières Claires</h4>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed font-sans">
            En tant que partenaire Concierge, l'utilisation standard des outils SpaceOne est facturée à hauteur de{" "}
            <span className="font-semibold text-slate-800">8% de commission</span> sur vos réservations. 
            L'activation des <span className="font-semibold text-blue-600">Tâches de Ménage</span> fait évoluer la Commission Globale à{" "}
            <span className="font-semibold text-slate-800">10% de commission</span>. Ce supplément finance la Suite de rotation autonome.
          </p>
        </div>
        <div className="bg-white border border-slate-200 shrink-0 p-5 rounded-xl flex flex-col justify-center items-center text-center space-y-2 min-w-[200px] shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Commission Actuelle</div>
          <div className="text-2xl font-black text-slate-800 font-sans">8.0%</div>
          <div className="w-full border-t border-slate-100 my-1" />
          <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Avec Module Ménage</div>
          <div className="text-2xl font-black text-blue-600 font-sans">10.0%</div>
        </div>
      </div>

      {/* Request Form or Pending Status Banner */}
      <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-xs text-center space-y-6">
        {isAlreadyRequested ? (
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-150">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h4 className="text-base font-bold text-slate-800 font-sans">Demande d'Activation En Cours</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-sans">
                Votre demande d'activation a été enregistrée le <span className="font-semibold text-slate-700">{requestedDateStr}</span>. 
                Un avenant de transition vers la tarification à <span className="font-semibold text-slate-700">10%</span> est préparé. 
                Notre directeur des comptes de SpaceOne va vous contacter sur <span className="font-semibold text-slate-700">{currentUser?.email}</span> pour finaliser la signature.
              </p>
            </div>
            <div className="inline-block px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold tracking-wider uppercase font-sans">
              Support actif • Traitement en cours
            </div>
          </div>
        ) : (
          <div className="space-y-5 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-150">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h4 className="text-base font-bold text-slate-800 font-sans">Prêt à surclasser vos opérations ?</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-sans">
                En cliquant ci-dessous, vous envoyez une notification instantanée à l'administration de SpaceOne. 
                Nous associerons vos coordonnées d'établissement (<span className="font-semibold text-slate-700">{currentUser?.businessName || "Conciergerie"}</span>) 
                à l'offre Premium pour générer votre nouvel avenant contractuel.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl font-sans font-medium">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleRequestClick}
              disabled={isSending}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-sm transition-all active:scale-98 flex items-center justify-center gap-2 mx-auto"
            >
              <span>{isSending ? "Envoi de la demande..." : "Demander l'accès au Module Ménage (10%)"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
