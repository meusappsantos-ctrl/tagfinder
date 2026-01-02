
import React, { useState, useEffect, useRef } from 'react';
import { User, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  updateDoc, 
  doc, 
  Timestamp, 
  getDocs 
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, MapPin, Loader2, Navigation, Edit, X, Globe, Trash2, Map as MapIcon, Crosshair, Server, ImageIcon, CheckCircle, ChevronRight, Hash, Database, Clock, Navigation2, Share2, FileDown, Layers, Locate, Activity, MapPinOff, ExternalLink, Maximize } from 'lucide-react';

declare const L: any;

interface DashboardProps {
  user: User;
}

interface GroupItem {
  id: string;
  content: string; 
  data?: Record<string, any>; 
  userId: string;
  userEmail: string;
  createdAt: Timestamp | null;
  groupType?: GroupType;
}

type GroupType = 'ctv' | 'telecom' | 'embarcados' | 'painel';
type ViewState = 'home' | GroupType;

const SYSTEM_DATA: Record<string, string[]> = {
  "SISTEMA 1": [
    "TR-1081KS-03 (BC)", "TR-1082KS-13 (BCC)", "BELTI EE-1080KS-04 (MBW)", 
    "BM-1080KS-04", "SE-1081KS-17", "SE-1081KS-03", "SE-1081KS-74", 
    "SE-1081KS-13", "SE-1082KS-95 -(DRIVE)"
  ],
  "SISTEMA 2": [
    "TR-1081KS-04", "TR-1081KS-52", "TR-1081KS-14 (bsm)", "TR-1081KS-05 (bsm)",
    "SE-1081KS-52", "SE-1081KS-04", "SE-1081KS-76", "BELTI EE-1080KS-02",
    "BM-1081KS-02", "SE-1081KS-50", "SE-1081KS-51", "SE-1081KS-56",
    "SE-1081KS-27", "SE-1081KS-97", "SE-1081KS-14", "SE-1081KS-18 (bsm)",
    "SE-1080KS-51 (bsm)"
  ],
  "SISTEMA 3": [
    "TR-1081KS-11", "TR-1081KS-01", "BM-1081KS-03", "BELTI EE-1081KS03 (MBW)",
    "SE-1081KS-01", "SE-1081KS-70", "SE-1081KS-15", "SE-1081KS-21",
    "SE-1081KS-11", "SE-1081KS-91"
  ],
  "SISTEMA 4": [
    "TR-1081KS-02", "TR-1081KS-12", "BM-1081KS-01", "BELTI EE-1081KS-01",
    "SE-1081KS-02", "SE-1081KS-72", "SE-1081KS-12", "SE-1081KS-23", "SE-1081KS-93"
  ],
  "5ª BRITAGEM": [
    "BM-1080KS-13", "BM-1080KS-12", "BM-1080KS-11", "TR-1080KS-81",
    "TR-1085KS-36", "TR-1080KS-83", "TR-1080KS-88", "TR-1080KS-87",
    "TR-1080KS-82", "TR-1080KS-85", "TR-1080KS-86", "TR-1080KS-80", "TR-1080KS-84"
  ],
  "CASA DE TRANSFERENCIA": [
    "TR-1082KS-01", "TR-1082KS-02", "TR-1082KS-03", "TR-1082KS-04",
    "TR-1082KS-05", "TR-1082KS-06", "TR-1080KS-37", "TR-1085KS-01",
    "TR-1085KS-04", "TR-1083KS-01", "TR-1084KS-01", "TR-1085KS-05",
    "SE-1084KS-01", "SE-1083KS-01", "SE-1082KS-02", "SE-1082KS-01",
    "SE-1085KS-23", "SE-1082KS-03", "SE-1082KS-04", "SE-6021KS-01", "SE-1085KS-22"
  ],
  "OVERLAND": [
    "TR-1083KS-03", "TR-1083KS-04", "SE-1084KS-22", "SE-1084KS-21",
    "TR-1084KS-02", "TR-1083KS-02", "EE-1084KS-01 (mts)", "EE-1083KS-01 (mts)",
    "SE-1083KS-02", "SE-1084KS-02"
  ]
};

const groupsConfig = {
  ctv: { 
    id: 'ctv', label: 'CFTV', icon: Tv, color: 'bg-blue-600', textColor: 'text-blue-400',
    lightColor: 'bg-blue-900/30', borderColor: 'border-blue-800/50', gradient: 'from-blue-600 to-blue-800'
  },
  telecom: { 
    id: 'telecom', label: 'Telecom', icon: Radio, color: 'bg-indigo-600', textColor: 'text-indigo-400',
    lightColor: 'bg-indigo-900/30', borderColor: 'border-indigo-800/50', gradient: 'from-indigo-600 to-indigo-800'
  },
  painel: { 
    id: 'painel', label: 'Painéis', icon: Server, color: 'bg-orange-600', textColor: 'text-orange-400',
    lightColor: 'bg-orange-900/30', borderColor: 'border-orange-800/50', gradient: 'from-orange-600 to-orange-800'
  },
  embarcados: { 
    id: 'embarcados', label: 'Embarcados', icon: Cpu, color: 'bg-emerald-600', textColor: 'text-emerald-400',
    lightColor: 'bg-emerald-900/30', borderColor: 'border-emerald-800/50', gradient: 'from-emerald-600 to-emerald-800'
  },
};

const HighlightedText: React.FC<{ text: string; highlight: string; className?: string }> = ({ text, highlight, className = "" }) => {
  if (!highlight.trim()) return <span className={className}>{text}</span>;
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className={className}>
      {parts.map((part, i) => regex.test(part) ? (
        <span key={i} className="bg-blue-500/30 text-blue-100 rounded px-0.5 font-bold">{part}</span>
      ) : part)}
    </span>
  );
};

const MiniMapPreview: React.FC<{ lat: number, lng: number, tag: string }> = ({ lat, lng, tag }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isLeafletReady, setIsLeafletReady] = useState(typeof L !== 'undefined');

  useEffect(() => {
    if (isLeafletReady) return;
    const interval = setInterval(() => {
      if (typeof L !== 'undefined') {
        setIsLeafletReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isLeafletReady]);

  useEffect(() => {
    if (!mapRef.current || !isLeafletReady) return;
    
    if (mapInstance.current) {
        mapInstance.current.setView([lat, lng], 16);
        return;
    }
    
    try {
      const map = L.map(mapRef.current, { 
        zoomControl: false, 
        attributionControl: false,
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false
      }).setView([lat, lng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      const marker = L.circleMarker([lat, lng], {
        radius: 8, fillColor: '#3b82f6', color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1
      }).addTo(map);
      marker.bindTooltip(tag || "Equipamento", { permanent: true, direction: 'top', className: 'tag-label' }).openTooltip();
      mapInstance.current = map;
      
      // Ajuste de tamanho após renderizar
      setTimeout(() => map.invalidateSize(), 100);
    } catch (e) { console.error("MiniMap error:", e); }

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [lat, lng, tag, isLeafletReady]);

  return <div ref={mapRef} className="w-full h-32 rounded-xl border border-slate-600 overflow-hidden mt-2 grayscale-[0.5] shadow-inner" />;
};

const GlobalMapModal: React.FC<{ items: GroupItem[], onClose: () => void, onSelectItem: (item: GroupItem) => void }> = ({ items, onClose, onSelectItem }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const initialFitDone = useRef(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [isLeafletReady, setIsLeafletReady] = useState(typeof L !== 'undefined');

  useEffect(() => {
    if (isLeafletReady) return;
    const interval = setInterval(() => {
      if (typeof L !== 'undefined') {
        setIsLeafletReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isLeafletReady]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(newPos);
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(newPos);
        }
      },
      (err) => console.log("GPS erro:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !isLeafletReady) return;
    
    try {
      const map = L.map(mapRef.current, {
        zoomControl: true,
        tap: true
      }).setView([-15.7801, -47.9292], 4);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
      
      // CRÍTICO: invalidateSize garante que os tiles carreguem corretamente após a abertura do modal
      setTimeout(() => map.invalidateSize(), 300);
    } catch (e) { console.error("Map init error:", e); }
  }, [isLeafletReady]);

  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current || !isLeafletReady) return;
    
    layerGroupRef.current.clearLayers();
    const bounds = L.latLngBounds([]);
    let hasItems = false;

    if (userPos) {
        if (!userMarkerRef.current) {
            userMarkerRef.current = L.circleMarker(userPos, {
                radius: 12, fillColor: '#3b82f6', color: '#ffffff', weight: 3, opacity: 1, fillOpacity: 0.8, className: 'user-marker-pulse'
            }).addTo(mapInstance.current);
            userMarkerRef.current.bindTooltip("Você", { permanent: false, direction: 'top' });
        }
        bounds.extend(userPos);
        hasItems = true;
    }

    items.forEach(item => {
      const geo = item.data?.["Geolocalização"];
      if (geo) {
        const parts = geo.split(',').map((p: string) => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const [lat, lng] = parts;
          let color = '#60a5fa';
          if (item.groupType === 'telecom') color = '#818cf8';
          if (item.groupType === 'painel') color = '#fb923c';
          if (item.groupType === 'embarcados') color = '#34d399';
          
          const marker = L.circleMarker([lat, lng], {
            radius: 10, fillColor: color, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1
          });
          
          const tagName = item.data?.["Tag"] || "Equipamento";
          marker.bindTooltip(tagName, { permanent: true, direction: 'top', className: 'tag-label', offset: [0, -5] });
          
          const popupContent = document.createElement('div');
          popupContent.className = "p-2 min-w-[120px]";
          popupContent.innerHTML = `
            <p class="text-xs font-black text-slate-900 uppercase mb-3">${tagName}</p>
            <div class="flex flex-col gap-2">
               <button id="view-details-${item.id}" class="bg-blue-600 text-white px-3 py-1.5 rounded text-[10px] font-bold border-none cursor-pointer hover:bg-blue-700 transition-colors">Abrir Detalhes</button>
               <a href="https://earth.google.com/web/search/${lat},${lng}" target="_blank" class="text-center bg-slate-800 text-white px-3 py-1.5 rounded text-[10px] font-bold no-underline hover:bg-slate-900 transition-colors">Ver no Google Earth</a>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.on('popupopen', () => {
             const btn = document.getElementById(`view-details-${item.id}`);
             if (btn) btn.onclick = () => { onSelectItem(item); onClose(); };
          });

          layerGroupRef.current.addLayer(marker);
          bounds.extend([lat, lng]);
          hasItems = true;
        }
      }
    });

    if (hasItems && !initialFitDone.current) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
      initialFitDone.current = true;
    }
  }, [items, userPos, onSelectItem, onClose, isLeafletReady]);

  const resetView = () => {
    if (!mapInstance.current || !layerGroupRef.current) return;
    const bounds = L.latLngBounds([]);
    let hasBounds = false;
    if (userPos) { bounds.extend(userPos); hasBounds = true; }
    layerGroupRef.current.eachLayer((layer: any) => {
      if (layer.getLatLng) { bounds.extend(layer.getLatLng()); hasBounds = true; }
    });
    if (hasBounds) mapInstance.current.fitBounds(bounds, { padding: [50, 50], animate: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-800 w-full h-[90vh] sm:h-[85vh] sm:max-w-6xl sm:rounded-[2.5rem] overflow-hidden flex flex-col border-t sm:border border-slate-700 shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl"><Globe className="w-5 h-5" /></div>
             <h3 className="font-black text-white text-lg tracking-tighter uppercase">Mapa de Ativos</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={resetView} title="Ajustar tela" className="p-2 bg-slate-700 text-white rounded-xl active:scale-95 transition-all hover:bg-slate-600"><Maximize className="w-6 h-6" /></button>
            <button onClick={() => userPos && mapInstance.current?.setView(userPos, 17)} title="Minha localização" className="p-2 bg-blue-600 text-white rounded-xl active:scale-95 transition-all hover:bg-blue-700"><Locate className="w-6 h-6" /></button>
            <button onClick={onClose} className="p-2 bg-slate-700 rounded-xl text-slate-400 active:scale-95 hover:bg-slate-600"><X className="w-6 h-6" /></button>
          </div>
        </div>
        <div className="flex-1 relative bg-slate-900">
            {!isLeafletReady && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-900">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Carregando Map Engine...</p>
              </div>
            )}
            <div ref={mapRef} className="absolute inset-0 z-0" />
            
            <div className="absolute bottom-6 left-6 z-[1000] p-4 bg-slate-800/80 backdrop-blur rounded-2xl border border-white/5 pointer-events-none">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status GPS</p>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${userPos ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-xs font-bold text-white uppercase">{userPos ? 'Conectado' : 'Buscando...'}</span>
                </div>
            </div>
            <style>{`
                .user-marker-pulse { animation: pulse-blue 2s infinite; }
                @keyframes pulse-blue {
                    0% { stroke-width: 3px; stroke: #fff; r: 12; }
                    50% { stroke-width: 12px; stroke: rgba(59, 130, 246, 0.5); r: 16; }
                    100% { stroke-width: 3px; stroke: #fff; r: 12; }
                }
                .leaflet-container { background: #0f172a !important; cursor: crosshair; }
            `}</style>
        </div>
      </div>
    </div>
  );
};

const isKeyVisible = (k: string) => {
  if (!k) return false;
  const key = k.toLowerCase();
  return !key.includes('geo') && !key.includes('link') && !key.includes('empty') && !k.startsWith('__') && k.trim() !== "";
};

const ItemDetail: React.FC<{ item: GroupItem; groupKey: string; config: any; user: User; onClose: () => void; onDelete: (id: string) => void; }> = ({ item, groupKey, config, user, onClose, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>(() => {
    const filtered: Record<string, any> = {};
    Object.entries(item.data || {}).forEach(([k, v]) => { if (isKeyVisible(k)) filtered[k] = v; });
    return filtered;
  });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(() => {
     if (item.data?.["Geolocalização"]) {
         const parts = item.data["Geolocalização"].split(',');
         if (parts.length === 2) return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
     }
     return null;
  });
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleGetLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGettingLocation(false); },
      () => { setGettingLocation(false); alert('Erro GPS'); },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const docRef = doc(db, groupKey, item.id);
          const finalData = { ...editData };
          if (location) {
              finalData["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
              finalData["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
          } else {
              finalData["Geolocalização"] = "";
              finalData["Link Maps"] = "";
          }
          await updateDoc(docRef, { data: finalData, content: finalData["Tag"] ? `Item: ${finalData["Tag"]}` : item.content });
          setIsEditing(false);
      } catch (e) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  return (
      <div className="bg-slate-900 min-h-screen sm:min-h-[500px] sm:rounded-[2.5rem] border-x sm:border border-slate-700 shadow-2xl overflow-hidden flex flex-col animate-slideUp">
          <div className={`p-5 sm:p-8 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-20`}>
              <div className="flex items-center gap-4 sm:gap-6">
                  <button onClick={onClose} className="p-2 sm:p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all"><ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                  <h2 className="text-lg sm:text-2xl font-black tracking-tighter uppercase truncate max-w-[180px] sm:max-w-none">{isEditing ? "Editando" : (editData["Tag"] || "Detalhes")}</h2>
              </div>
              <div className="flex gap-2">
                 {!isEditing ? (
                     <>
                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white/20 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all hover:bg-white/30"><Edit className="w-4 h-4" /> Editar</button>
                        <button onClick={() => confirm("Excluir?") && onDelete(item.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg transition-all hover:bg-red-500/40"><Trash2 className="w-5 h-5" /></button>
                     </>
                 ) : (
                    <button onClick={() => setIsEditing(false)} className="p-2 bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
                 )}
              </div>
          </div>
          <div className="p-4 sm:p-8 lg:p-12 space-y-6 flex-1 overflow-y-auto pb-24 sm:pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col gap-4 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl border ${location ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}><MapPin className="w-5 h-5" /></div>
                      <div className="flex-1">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coordenadas</h4>
                         <p className="text-xs sm:text-sm text-slate-200 font-mono font-bold">{location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : "Não registrado"}</p>
                      </div>
                      {isEditing && location && (
                         <button onClick={() => setLocation(null)} className="p-2 bg-red-500/10 text-red-400 rounded-lg"><MapPinOff className="w-5 h-5" /></button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {isEditing ? (
                            <button onClick={handleGetLocation} className="w-full py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all">{gettingLocation ? "Obtendo..." : "Atualizar Localização"}</button>
                        ) : location && (
                            <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`, '_blank')} className="w-full py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2"><Navigation2 className="w-3 h-3" /> Abrir Rota</button>
                        )}
                    </div>
                </div>
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex items-center gap-4 shadow-xl">
                    <div className="p-3 bg-slate-700/50 text-slate-400 rounded-xl border border-slate-600/30"><Clock className="w-5 h-5" /></div>
                    <div><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registrado em</h4><p className="text-xs sm:text-sm text-slate-200 font-bold">{item.createdAt ? item.createdAt.toDate().toLocaleDateString('pt-BR') : "---"}</p></div>
                </div>
              </div>
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Atributos do Ativo</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(editData).map(([key, value]) => (
                        <div key={key} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                          <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2 text-blue-400"><Database className="w-3 h-3" /> {key}</h5>
                          {isEditing ? (
                            <input type="text" value={String(value)} onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-bold focus:border-blue-500 outline-none" />
                          ) : (
                            <p className="text-white font-black text-sm uppercase tracking-tight">{String(value)}</p>
                          )}
                        </div>
                    ))}
                 </div>
              </div>
              {isEditing && (
                <div className="grid grid-cols-2 gap-4 pt-6">
                    <button onClick={() => confirm("Excluir registro?") && onDelete(item.id)} className="py-5 rounded-2xl bg-red-600/20 text-red-400 font-black uppercase text-[10px] border border-red-500/10">Excluir Ativo</button>
                    <button onClick={handleSave} disabled={isSaving} className={`py-5 rounded-2xl text-white font-black uppercase text-[10px] ${config.color} shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all`}>
                        {isSaving ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>} Salvar Mudanças
                    </button>
                </div>
              )}
          </div>
      </div>
  );
};

const ItemCard: React.FC<{ item: GroupItem; config: any; onSelect: () => void; onDelete: (e: React.MouseEvent, id: string) => void; onEdit: (e: React.MouseEvent, item: GroupItem) => void; searchHighlight: string; }> = ({ item, config, onSelect, onDelete, onEdit, searchHighlight }) => {
  const data = item.data || {};
  const tagValue = data["Tag"] || item.content.split('|')[0].trim().replace(/^Item:\s*/i, '');
  const localValue = data["Local"] || "Sem Localização";
  const hasGeo = !!data["Geolocalização"] && data["Geolocalização"].trim() !== "";

  return (
    <div onClick={onSelect} className="relative flex flex-col bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-1 shadow hover:shadow-xl transition-all cursor-pointer active:scale-95 group overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-white truncate tracking-tighter uppercase group-hover:text-blue-400 transition-colors"><HighlightedText text={tagValue} highlight={searchHighlight} /></h3>
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={(e) => onEdit(e, item)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"><Edit className="w-3.5 h-3.5" /></button>
             <button onClick={(e) => onDelete(e, item.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 bg-slate-900/30 px-2.5 py-1.5 rounded-lg border border-white/5 shadow-inner">
          <MapPin className={`w-3.5 h-3.5 ${hasGeo ? 'text-emerald-500' : 'text-slate-600'}`} />
          <span className="text-[10px] font-bold truncate tracking-tight uppercase">{localValue}</span>
        </div>
        
        {config.id === 'painel' && (
            <div className="flex flex-wrap gap-1">
                {['Switch1', 'Switch2', 'Switch3'].map(sw => data[sw] && (
                    <div key={sw} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/30 rounded text-[7px] text-slate-300 font-bold border border-white/5">
                        <Activity className="w-2 h-2 text-blue-400" />
                        <span>{data[sw]}</span>
                    </div>
                ))}
            </div>
        )}

        <div className="flex items-center justify-between text-[8px] font-black text-slate-500 pt-2 border-t border-white/5 uppercase tracking-widest">
           <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${hasGeo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>{config.label}</div>
           <span>{hasGeo ? 'MAPA OK' : 'SEM MAPA'}</span>
        </div>
      </div>
    </div>
  );
};

const GroupPage: React.FC<{ groupKey: GroupType; user: User; onBack: () => void; initialSelectedItem?: GroupItem | null }> = ({ groupKey, user, onBack, initialSelectedItem }) => {
  const config = groupsConfig[groupKey];
  const Icon = config.icon;
  const [items, setItems] = useState<GroupItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GroupItem | null>(initialSelectedItem || null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '' });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const q = query(collection(db, groupKey), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as GroupItem[]));
  }, [groupKey]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalLocal = formData.local === "NOVO" ? formData.customLocal : formData.local;
      const finalEquip = formData.equipamento === "NOVO" ? formData.customEquipamento : formData.equipamento;
      let data: any = {};
      if (groupKey === 'painel') {
          data = { "Tag": formData.tag, "Switch1": formData.switch1, "Switch2": formData.switch2, "Switch3": formData.switch3, "Local": finalLocal, "Equipamento": finalEquip };
      } else {
          data = { "Tag": formData.tag, "Local": finalLocal, "IP / Equipamento": formData.ip };
      }
      if (location) {
        data["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
        data["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      }
      await addDoc(collection(db, groupKey), { content: `Item: ${formData.tag}`, data, userId: user.uid, userEmail: user.email, createdAt: serverTimestamp() });
      setIsModalOpen(false);
      setFormData({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '' });
      setLocation(null);
    } catch (e) { alert('Erro'); } finally { setLoading(false); }
  };

  const filteredItems = items.filter(i => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    const dataValues = Object.values(i.data || {}).map(v => String(v).toLowerCase());
    return i.content.toLowerCase().includes(s) || dataValues.some(val => val.includes(s));
  });

  if (selectedItem) return <ItemDetail item={selectedItem} groupKey={groupKey} config={config} user={user} onClose={() => setSelectedItem(null)} onDelete={(id) => deleteDoc(doc(db, groupKey, id)).then(() => setSelectedItem(null))} />;

  return (
    <div className="pb-24 animate-fadeIn">
      <div className="p-6 sm:p-10 mb-6 bg-slate-800/60 rounded-[2rem] border border-slate-700 flex flex-col gap-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-3 bg-slate-700 rounded-xl text-slate-300 transition-all hover:bg-slate-600 shadow-md"><ArrowLeft className="w-6 h-6" /></button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <div className={`p-1 rounded bg-gradient-to-br ${config.gradient} text-white shadow-sm`}><Icon className="w-3 h-3" /></div>
                 <span className="text-[9px] uppercase tracking-widest font-black text-slate-500">{config.label}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase">{config.label}</h2>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className={`hidden sm:flex px-6 py-3 rounded-xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] tracking-widest items-center gap-2 shadow-xl hover:scale-105 transition-all`}>
            <Plus className="w-4 h-4" /> Novo Ativo
          </button>
        </div>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
        <input type="text" placeholder={`Buscar no inventário...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white outline-none font-bold shadow-inner focus:border-blue-500 transition-all" />
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredItems.map(item => <ItemCard key={item.id} item={item} config={config} onSelect={() => setSelectedItem(item)} onDelete={(e, id) => { e.stopPropagation(); confirm("Remover?") && deleteDoc(doc(db, groupKey, id)) }} onEdit={(e, i) => { e.stopPropagation(); setSelectedItem(i); }} searchHighlight={searchTerm} />)}
      </div>

      <button onClick={() => setIsModalOpen(true)} className={`fixed bottom-6 right-6 w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-[0_20px_50px_rgba(8,_112,_184,_0.5)] z-40 bg-gradient-to-r ${config.gradient} hover:scale-110 active:scale-90 transition-all border border-white/10`}><Plus className="w-8 h-8" /></button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
          <div className="bg-slate-800 w-full h-[95vh] sm:h-auto sm:max-w-md sm:rounded-[2.5rem] border-t sm:border border-slate-600 overflow-y-auto">
            <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10 shadow-xl`}>
              <h3 className="text-xl font-black tracking-tighter uppercase">Novo Ativo</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <button type="button" onClick={() => { setGettingLocation(true); navigator.geolocation.getCurrentPosition(p => { setLocation({lat: p.coords.latitude, lng: p.coords.longitude}); setGettingLocation(false); }, () => setGettingLocation(false), {enableHighAccuracy: true}) }} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase flex flex-col items-center gap-1 transition-all ${location ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-blue-400 border border-slate-600'}`}>
                {gettingLocation ? <Loader2 className="animate-spin w-4 h-4"/> : location ? <CheckCircle className="w-4 h-4"/> : <Crosshair className="w-4 h-4"/>} {location ? "GPS ATIVO" : "OBTER POSIÇÃO"}
              </button>
              
              {location && <MiniMapPreview lat={location.lat} lng={location.lng} tag={formData.tag} />}

              <div className="space-y-4">
                <input type="text" placeholder="Tag do Ativo" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-bold uppercase focus:border-blue-500 shadow-inner outline-none" />
                {groupKey === 'painel' ? (
                   <>
                     {['switch1', 'switch2', 'switch3'].map((sw, i) => <input key={sw} type="text" placeholder={`Switch ${i+1}`} value={formData[sw]} onChange={e => setFormData({...formData, [sw]: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-mono focus:border-blue-500 outline-none" />)}
                     <select value={formData.local} onChange={e => setFormData({...formData, local: e.target.value, equipamento: ''})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-bold focus:border-blue-500 outline-none">
                        <option value="">Selecionar Local...</option>
                        {Object.keys(SYSTEM_DATA).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        <option value="NOVO">+ ADICIONAR NOVO</option>
                     </select>
                     {formData.local === "NOVO" && <input type="text" placeholder="Nome do Local" value={formData.customLocal} onChange={e => setFormData({...formData, customLocal: e.target.value})} className="w-full px-4 py-3 bg-slate-900 border border-blue-500/50 rounded-xl text-white text-sm font-bold shadow-lg outline-none" />}
                   </>
                ) : (
                   <>
                     <input type="text" placeholder="Localização Técnica" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-bold uppercase focus:border-blue-500 outline-none" />
                     <input type="text" placeholder="IP ou Identificador" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-mono focus:border-blue-500 outline-none" />
                   </>
                )}
              </div>
              <button type="submit" disabled={loading} className={`w-full py-5 rounded-2xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] shadow-2xl active:scale-95 transition-all disabled:opacity-50`}>
                 {loading ? <Loader2 className="animate-spin w-5 h-5"/> : "Confirmar Cadastro"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [allMapItems, setAllMapItems] = useState<GroupItem[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [itemFromMap, setItemFromMap] = useState<GroupItem | null>(null);

  const handleOpenGlobalMap = async () => {
    setLoadingMap(true);
    try {
      const colls = ['ctv', 'telecom', 'painel', 'embarcados'];
      const results = await Promise.all(colls.map(c => getDocs(collection(db, c))));
      const items = results.flatMap((snap, idx) => snap.docs.map(d => ({ id: d.id, ...d.data(), groupType: colls[idx] as GroupType })));
      setAllMapItems(items);
      setIsMapModalOpen(true);
    } catch (e) { console.error("Map fetch error:", e); } finally { setLoadingMap(false); }
  };

  if (currentView !== 'home') return <div className="min-h-screen bg-slate-900 p-4 sm:p-12"><div className="max-w-7xl mx-auto"><GroupPage groupKey={currentView} user={user} onBack={() => { setCurrentView('home'); setItemFromMap(null); }} initialSelectedItem={itemFromMap} /></div></div>;

  return (
    <div className="min-h-screen bg-slate-900 p-5 sm:p-12 text-white relative flex flex-col overflow-x-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse"></div>
      
      {isMapModalOpen && <GlobalMapModal items={allMapItems} onClose={() => setIsMapModalOpen(false)} onSelectItem={(item) => { setItemFromMap(item); setCurrentView(item.groupType as GroupType); }} />}
      
      <div className="max-w-6xl mx-auto w-full space-y-10 animate-fadeIn relative z-10 flex-1">
        <header className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[8px] font-black uppercase tracking-widest text-blue-400">
              <div className="w-1 h-1 rounded-full bg-blue-400 animate-ping"></div> TagFinder Cloud v2
            </div>
            <button onClick={() => signOut(auth)} className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-500 hover:bg-slate-700 shadow-md transition-all active:scale-90"><LogOut className="w-5 h-5" /></button>
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter leading-tight uppercase">
              Olá, <span className="text-blue-500">{user.displayName || user.email?.split('@')[0]}</span>
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-medium uppercase tracking-wider">Gestão de inventário Georreferenciado</p>
          </div>

          <button 
            onClick={handleOpenGlobalMap} 
            disabled={loadingMap} 
            className="group relative overflow-hidden w-full p-8 sm:p-10 rounded-[2.5rem] bg-slate-800/60 border border-slate-700 shadow-2xl transition-all active:scale-[0.98] hover:bg-slate-800 hover:border-blue-500/30 text-left"
          >
            <div className="absolute top-0 right-0 p-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:bg-blue-600/20"></div>
            <div className="flex items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-6">
                <div className="p-4 sm:p-6 bg-blue-500/20 text-blue-400 rounded-3xl ring-4 ring-white/5 group-hover:scale-110 transition-transform shadow-lg">
                  {loadingMap ? <Loader2 className="w-8 h-8 animate-spin"/> : <Globe className="w-8 h-8" />}
                </div>
                <div>
                   <h3 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase">Painel Geográfico</h3>
                   <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Navegação interativa • Geolocalização em Tempo Real</p>
                </div>
              </div>
              <div className="hidden sm:flex w-12 h-12 rounded-full bg-slate-700 items-center justify-center group-hover:bg-blue-600 transition-colors shadow-sm">
                 <ArrowRight className="w-6 h-6 text-white" />
              </div>
            </div>
          </button>
        </header>

        <section className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pb-12">
          {Object.entries(groupsConfig).map(([key, group]) => (
             <button 
              key={key} 
              onClick={() => setCurrentView(key as GroupType)} 
              className="relative overflow-hidden group bg-slate-800/40 backdrop-blur-2xl p-6 sm:p-8 rounded-[2rem] border border-slate-700/50 flex flex-col items-start transition-all active:scale-95 shadow-xl hover:bg-slate-700/60"
             >
               <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl ${group.lightColor} ${group.textColor} flex items-center justify-center mb-5 ring-4 ring-white/5 group-hover:scale-110 transition-transform shadow-md`}><group.icon className="w-6 h-6 sm:w-8 sm:h-8" /></div>
               <h2 className="text-xl font-black mb-2 tracking-tighter uppercase">{group.label}</h2>
               <div className={`inline-flex items-center gap-2 font-black text-[8px] uppercase tracking-widest ${group.textColor}`}>Acessar Inventário <ArrowRight className="w-3 h-3" /></div>
             </button>
          ))}
        </section>
      </div>
      
      <footer className="py-8 text-center mt-auto border-t border-white/5">
        <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.2em]">&copy; 2024 TagFinder Enterprise • Gestão Técnica Industrial</p>
      </footer>
    </div>
  );
};

export default Dashboard;
