import React, { useState } from "react";
import { MessageThread, Booking } from "../types";
import { Sparkles, Send, Copy, AlertCircle, RefreshCw, MessageSquare, ChevronRight, User, Calendar, Tag, CheckCircle2 } from "lucide-react";

interface CommunicationTabProps {
  threads: MessageThread[];
  bookings: Booking[];
  onAddMessage: (threadId: string, text: string, sender: "host" | "guest") => void;
}

export default function CommunicationTab({ threads, bookings, onAddMessage }: CommunicationTabProps) {
  const [selectedThreadId, setSelectedThreadId] = useState<string>(threads[0]?.id || "");
  const [replyText, setReplyText] = useState("");

  // AI Assistant form options
  const [aiPromptTopic, setAiPromptTopic] = useState("");
  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  // Quick Preset prompts (translated to prompt tailored answers in French)
  const presets = [
    { label: "🔑 Infos d'Arrivée", prompt: "Explain self check-in gate instructions in French, lockbox code is '4822', and express warm prestige French hospitality for Auberge Paul Sungani." },
    { label: "🕚 Heure de Départ", prompt: "Politely verify in French if they need any assistance checking out tomorrow, ask for their target check-out time, and outline trash bin directions warmly." },
    { label: "🔇 Nuisance Sonore", prompt: "Politely request in French that they lower their audio/chatter because local building regulations require quiet quiet hours after 10:00 PM." },
    { label: "⭐ Demande d'Avis", prompt: "Thank them kindly in French for their stay under Auberge Paul Sungani, express they were wonderful guests, and ask if they would consider leaving a 5-star review." }
  ];

  const activeThread = threads.find((t) => t.id === selectedThreadId);
  const associatedBooking = bookings.find((b) => b.id === activeThread?.bookingId);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThreadId) return;

    onAddMessage(selectedThreadId, replyText.trim(), "host");
    setReplyText("");
  };

  const handleCopyDraft = () => {
    if (!generatedDraft) return;
    setReplyText(generatedDraft);
    // Clear draft view or highlight output
  };

  const generateAIDraft = async () => {
    const finalPrompt = customAiPrompt.trim() || aiPromptTopic;
    if (!finalPrompt) {
      setAiError("Veuillez saisir une consigne personnalisée ou choisir un sujet d'aide.");
      return;
    }

    setIsAiGenerating(true);
    setAiError(null);
    setGeneratedDraft("");

    try {
      const response = await fetch("/api/chat-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          guestName: activeThread?.guestName || "Voyageur",
          apartmentName: activeThread?.apartmentName || "Logement",
          dates: associatedBooking ? `${associatedBooking.checkIn} au ${associatedBooking.checkOut}` : "N/A",
          bookingStatus: associatedBooking?.status || "Confirmé",
          additionalNotes: associatedBooking?.notes || ""
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Le serveur a renvoyé l'erreur ${response.status}`);
      }

      const data = await response.json();
      if (data.text) {
        setGeneratedDraft(data.text);
      } else {
        throw new Error("Impossible d'obtenir une réponse de l'assistant IA Gemini.");
      }
    } catch (err: any) {
      console.error("AI Assistant trigger failure:", err);
      setAiError(err.message || "Erreur lors de la génération du brouillon. Veuillez vérifier la connexion au service Gemini.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSimulateIncomingMsg = () => {
    if (!selectedThreadId) return;
    const simTexts = [
      "Merci beaucoup ! C'est tout à fait normal. Nous ferons attention à baisser le ton après 22h.",
      "Génial, nous avons les clés ! Quelles sont les consignes de départ à suivre ?",
      "Pas de problème, nous laisserons les clés dans la boîte à clés et viderons les poubelles avant de partir.",
      "Notre vol est légèrement retardé. Est-ce possible d'arriver vers 19h00 ce soir ?"
    ];
    const picked = simTexts[Math.floor(Math.random() * simTexts.length)];
    onAddMessage(selectedThreadId, picked, "guest");
  };

  return (
    <div id="communication-tab-container" className="space-y-6">
      {/* Overview Head */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 font-sans">
          Communications Voyageurs
        </h2>
        <p className="text-sm text-slate-500 font-sans mt-0.5">
          Échangez directement avec vos voyageurs et rédigez instantanément de formidables messages personnalisés grâce à l'IA Gemini.
        </p>
      </div>

      {/* Main chat center pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] items-stretch">
        {/* Left Side: Threads list */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-4 space-y-4 flex flex-col justify-start">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400 font-sans">
              Conversations Actives
            </span>
            <button
              onClick={handleSimulateIncomingMsg}
              className="text-[10px] text-slate-500 hover:text-slate-800 underline font-mono flex items-center gap-1 cursor-pointer"
              title="Simuler la réception d'un nouveau message au hasard pour valider les flux"
            >
              Simuler la réception
            </button>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[500px]">
            {threads.map((thread) => {
              const isActive = thread.id === selectedThreadId;
              const lastMsg = thread.messages[thread.messages.length - 1];

              return (
                <button
                  key={thread.id}
                  id={`thread-button-${thread.id}`}
                  onClick={() => {
                    setSelectedThreadId(thread.id);
                    setGeneratedDraft("");
                    setAiError(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all text-sm flex flex-col space-y-1.5 cursor-pointer relative overflow-hidden group ${
                    isActive
                      ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                      : "bg-white border-slate-100 hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold block truncate leading-none">
                      {thread.guestName}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-sm ${
                        isActive
                          ? "bg-white/10 text-slate-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {thread.apartmentName.split(" ")[0]}
                    </span>
                  </div>
                  {lastMsg && (
                    <p
                      className={`text-xs truncate font-sans leading-relaxed ${
                        isActive ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      <span className="font-semibold">
                        {lastMsg.sender === "host" ? "Vous : " : "Voyageur : "}
                      </span>
                      {lastMsg.text}
                    </p>
                  )}
                </button>
              );
            })}

            {threads.length === 0 && (
              <div className="text-center py-10 text-slate-400 font-sans text-xs">
                Aucune conversation active pour le moment.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Actively selected thread context + AI drafting area */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Column A: Chat bubbles screen */}
          {activeThread ? (
            <div className="bg-white border border-slate-100 rounded-2xl flex flex-col justify-between overflow-hidden">
              {/* Header profile info */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col">
                <span className="font-bold text-slate-900 text-sm">{activeThread.guestName}</span>
                <span className="text-[11px] text-slate-500 font-sans mt-0.5">
                  réside à <span className="font-semibold">{activeThread.apartmentName}</span>
                </span>
              </div>

              {/* Chat message bubbles scroll container */}
              <div className="p-4 space-y-3 overflow-y-auto flex-1 max-h-[380px] min-h-[300px] bg-slate-50/20 font-sans">
                {activeThread.messages.map((m) => {
                  const isHost = m.sender === "host";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[85%] ${isHost ? "ml-auto items-end" : "mr-auto items-start"}`}
                    >
                      {/* Avatar indicator */}
                      <span className="text-[10px] text-slate-400 mb-0.5 font-mono">
                        {isHost ? "Vous (Hôte)" : "Voyageur"}
                      </span>
                      <div
                        className={`rounded-2xl px-4 py-2 text-xs leading-relaxed shadow-3xs ${
                          isHost
                            ? "bg-slate-900 text-white rounded-tr-none"
                            : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="text-[9px] text-slate-300 mt-1 font-mono">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Reply submission */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Rédigez votre réponse ici..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="bg-slate-50 text-xs text-slate-800 placeholder-slate-400 px-4.5 py-3 rounded-lg border border-slate-100 focus:outline-hidden w-full font-sans"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-slate-400 font-sans">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-semibold">Sélectionnez une discussion</p>
              <p className="text-xs mt-1">Choisissez une conversation dans la liste de gauche pour échanger.</p>
            </div>
          )}

          {/* Column B: Smart AI assistant drafting portal */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-start space-y-4">
            {/* AI Assistant Title */}
            <div className="flex items-center gap-2 text-slate-900 border-b border-slate-200/60 pb-3">
              <div className="p-1.5 bg-slate-900 rounded-lg text-white">
                <Sparkles className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-900 font-sans">
                  Brouillons Intelligents Gemini<sup>IA</sup>
                </h4>
                <p className="text-[10px] text-slate-500">Personnalisés selon les détails du séjour.</p>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">
                Sujets de réponse rapide
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiPromptTopic(p.prompt);
                      setCustomAiPrompt("");
                    }}
                    className={`px-2 py-1.5 rounded-lg border text-left text-[11px] font-medium transition-all cursor-pointer truncate ${
                      aiPromptTopic === p.prompt
                        ? "bg-slate-950 border-slate-950 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual input */}
            <div className="space-y-1.5 flex-1 flex flex-col justify-start">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">
                Ou saisissez une consigne personnalisée
              </label>
              <textarea
                placeholder="Ex. Écrire un message pour indiquer qu'ils ont oublié un chargeur et proposer de le renvoyer par la poste..."
                value={customAiPrompt}
                onChange={(e) => {
                  setCustomAiPrompt(e.target.value);
                  setAiPromptTopic(""); // Clean preset selection if host types custom query
                }}
                className="w-full text-xs text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-slate-400 font-sans h-20 resize-none"
              />
            </div>

            {/* Generate Trigger */}
            <button
              type="button"
              id="btn-trigger-ai-draft"
              disabled={isAiGenerating || (!aiPromptTopic && !customAiPrompt.trim())}
              onClick={generateAIDraft}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg py-2 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {isAiGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Rédaction par Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Générer le brouillon IA
                </>
              )}
            </button>

            {/* Output view container */}
            <div className="space-y-2 pt-2 border-t border-slate-200/60 flex-1 flex flex-col justify-between">
              {/* Error messages */}
              {aiError && (
                <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-[11px] text-rose-700 flex items-start gap-1.5 font-sans">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Actual drafted output */}
              {generatedDraft && (
                <div className="space-y-2 flex-1 flex flex-col justify-start">
                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Brouillon généré avec succès !
                    </span>
                    <button
                      onClick={handleCopyDraft}
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-0.5 hover:underline font-bold"
                    >
                      <Copy className="w-3 h-3" /> Appliquer la réponse
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={generatedDraft}
                    className="w-full text-xs text-slate-700 bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 h-36 resize-none font-sans overflow-y-auto leading-relaxed focus:outline-hidden"
                  />
                </div>
              )}

              {/* Idle State guide lines */}
              {!generatedDraft && !aiError && !isAiGenerating && (
                <div className="text-center py-6 text-[11px] text-slate-400 italic">
                  Sélectionnez un sujet rapide ou de l'aide ci-dessus pour que l'IA rédige la réponse idéale.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
