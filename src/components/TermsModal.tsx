import React, { useState } from "react";
import { X, Shield, FileText, Scale, Percent, Lock, UserCheck } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "concierge" | "guest";
}

export default function TermsModal({ isOpen, onClose, defaultTab = "concierge" }: TermsModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<"concierge" | "guest">(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-100 flex items-center justify-center p-4 animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-slide-up"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight font-sans">
                Mentions Légales & Conditions Générales
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Dernière mise à jour : Juin 2026 • Version 1.4-EU
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100/60 p-1 border-b border-slate-100">
          <button
            onClick={() => setActiveSubTab("concierge")}
            className={`flex-1 py-1.5 text-xs font-bold font-sans rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-2 ${
              activeSubTab === "concierge"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/40"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            Accord Partenaire (Concierge)
          </button>
          <button
            onClick={() => setActiveSubTab("guest")}
            className={`flex-1 py-1.5 text-xs font-bold font-sans rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-2 ${
              activeSubTab === "guest"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/40"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Utilisateurs & Voyageurs (Clients)
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-600 text-xs leading-relaxed font-sans max-h-[50vh]">
          {activeSubTab === "concierge" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Scale className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-sm tracking-tight">1. Structuration des Commissions SpaceOne</h4>
              </div>
              <p>
                SpaceOne met à disposition des gestionnaires d'hébergement et des conciergeries une infrastructure 
                SaaS haut de gamme pour centraliser la communication, les séjours de luxe et le suivi logistique. 
                Les frais d'exploitation de notre plateforme s'appuient sur un modèle de taux de commission proportionnel :
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-705">
                <li>
                  <strong className="text-slate-800">Offre Standard (8% de Commission) :</strong> Intègre la gestion de catalogue, 
                  le calendrier synchronisé d'occupation, les fiches voyageurs de luxe et la Messagerie Assistée par Intelligence Artificielle.
                </li>
                <li>
                  <strong className="text-slate-800">Offre Turnover Plus (10% de Commission) :</strong> Active le module complet des 
                  <strong className="text-blue-600"> Tâches de Ménage</strong>. Cette majoration contractuelle de 2% finance le système 
                  d'assignation automatisé sur check-outs, les checklists haut de gamme par hébergement, l'accès sécurisé pour 
                  les sous-comptes intervenants, et la conformité de terrain SpaceOne.
                </li>
              </ul>
              
              <div className="flex items-center gap-2 text-slate-800 pt-2">
                <Lock className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-sm tracking-tight">2. Traitement des Données Personnelles (PII)</h4>
              </div>
              <p>
                Les Partenaires Concierges s'engagent à respecter strictement le Règlement Général sur la Protection des Données (RGPD). 
                Toutes les informations à caractère personnel concernant les voyageurs de luxe (téléphones, e-mails de contact, 
                coordonnées WhatsApp) transmises via l'API ou le panneau SpaceOne ne doivent, en aucun cas, être exportées vers 
                des serveurs tiers non sécurisés. Le stockage s'effectue dans des compartiments cryptés à l'aide de règles 
                de sécurité Zero-Trust Attribute-Based Access Control de Firestore.
              </p>

              <div className="flex items-center gap-2 text-slate-800 pt-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-sm tracking-tight">3. Obligations Opérationnelles & Avenants</h4>
              </div>
              <p>
                L'activation des Tâches de Ménage est formalisée par la signature d'un avenant contractuel. L'envoi d'une demande 
                dans l'interface "Tâches de Ménage" déclenche l'examen commercial par nos directeurs de compte pour intégration sous 
                48 heures. Toute rupture des standards 5 étoiles d'un concierge peut entraîner la suspension temporaire de son compte.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Lock className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-sm tracking-tight">1. Protection Absolute de vos Coordonnées Privées</h4>
              </div>
              <p>
                Chez SpaceOne, la discrétion et la confidentialité des données voyageurs sont ancrées au cœur de notre modèle sécuritaire. 
                Toutes les informations soumises lors de la création d'un profil (noms, e-mails, profils) sont isolées de manière étanche. 
                Le système interdit aux comptes subalternes n'ayant pas les privilèges adéquats d'accéder à vos documents privés.
              </p>

              <div className="flex items-center gap-2 text-slate-800 pt-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-sm tracking-tight">2. Utilisation Intelligente & Assistant Virtuel de Séjour</h4>
              </div>
              <p>
                Afin de fluidifier l'accueil, les voyageurs réguliers bénéficient d'une interface de chat centralisée gérée en local. 
                Les transcriptions textuelles de l'intelligence artificielle ne sont conservées que pour assurer la cohésion 
                de la conciergerie locale avec vos souhaits spécifiques. À tout moment, un voyageur peut solliciter la purge intégrale 
                de son historique de messagerie.
              </p>

              <div className="flex items-center gap-2 text-slate-800 pt-2">
                <Scale className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-sm tracking-tight">3. Responsabilité de Réservation</h4>
              </div>
              <p>
                Les voyageurs s'engagent à fournir des détails sincères lors de leurs check-ins. Le respect des rituels de l'hébergement 
                et la restitution des locaux dans un état d'usage décent font partie des Conditions Générales acceptées d'office 
                à l'enregistrement de l'Espace Logement.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-sans">
            Accord exécutoire numériquement • SpaceOne SAS
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold tracking-widest uppercase cursor-pointer transition-all active:scale-98"
          >
            Fermer / J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
}
