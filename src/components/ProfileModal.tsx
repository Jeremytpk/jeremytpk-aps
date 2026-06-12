import React, { useState } from "react";
import { HomeOwner } from "../types";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { X, User, Building, Mail, Link, Key, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: HomeOwner;
  onProfileUpdated: (updatedUser: HomeOwner) => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}: ProfileModalProps) {
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [businessName, setBusinessName] = useState(currentUser.businessName);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || "");
  
  // Security state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status flags
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    // Input Validations
    if (!fullName.trim() || !businessName.trim()) {
      setErrorMsg("Veuillez remplir le nom et le nom de l'espace / entreprise.");
      setIsSaving(false);
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMsg("Le mot de passe doit comporter au moins 6 caractères.");
        setIsSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("Les mots de passe ne correspondent pas.");
        setIsSaving(false);
        return;
      }
    }

    try {
      // 1. Update Password in Firebase Auth if specified
      if (newPassword && auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, newPassword);
        } catch (pwErr: any) {
          console.error("Password update failed:", pwErr);
          if (pwErr.code === "auth/requires-recent-login") {
            setErrorMsg(
              "Pour des raisons de sécurité, le changement de mot de passe nécessite une connexion récente. Veuillez vous déconnecter et vous reconnecter, puis réessayer."
            );
            setIsSaving(false);
            return;
          } else {
            setErrorMsg(`Erreur mot de passe : ${pwErr.message || pwErr}`);
            setIsSaving(false);
            return;
          }
        }
      }

      // 2. Update Firestore User Document
      const updatedUser: HomeOwner = {
        ...currentUser,
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      };

      const path = `users/${currentUser.id}`;
      try {
        await setDoc(doc(db, "users", currentUser.id), updatedUser);
      } catch (dbErr: any) {
        handleFirestoreError(dbErr, OperationType.WRITE, path);
      }

      // 3. Callback to Parent App Component
      onProfileUpdated(updatedUser);
      setSuccessMsg("Votre compte et votre profil ont été mis à jour avec succès !");
      
      // Clear password fields on success
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Profile update failed:", err);
      setErrorMsg(err.message || String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans">
              Mon Profil & Espace Conciergerie
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Éditez vos informations de gestion et d'authentification SpaceOne
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-150 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Display successes / errors */}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-850 text-xs font-bold font-sans rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 animate-bounce" />
              <div>{successMsg}</div>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-850 text-xs font-bold font-sans rounded-xl flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 animate-pulse" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Section 1: Informations de l'Hébergeur */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <User className="w-3.5 h-3.5" />
              Informations Personnelles
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                  Prénom & Nom *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                    placeholder="Ex: Jean-Marc Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                  Nom de l'Espace *
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                    placeholder="Ex: Conciergerie Étoile"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                Adresse Email (Sécurité)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full text-slate-450 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm font-sans cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-sans mt-1">
                L'adresse email est immuable car elle est directement associée au compte administrateur.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                URL de votre Photo de Profil (Optionnel)
              </label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Inscrivez l'adresse URL d'une image d'avatar..."
                  className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Sécurité - Changement du Mot de Passe */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Key className="w-3.5 h-3.5" />
              Sécurité du Compte (Nouveau mot de passe)
            </h4>

            <p className="text-[11px] text-slate-500 font-sans">
              Laissez ces champs vides si vous ne souhaitez pas modifier votre mot de passe actuel.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg pl-9 pr-10 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ressaisir le mot de passe"
                    className="w-full text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg pl-9 pr-10 py-2 text-sm focus:outline-hidden focus:border-slate-400 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-600 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>Enregistrer les modifications</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
