
import React, { useState, useEffect, useRef } from 'react';
import { User, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  updateDoc, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { 
  LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, 
  MapPin, Loader2, X, Globe, Trash2, Crosshair, 
  Server, CheckCircle, Database, Clock, Navigation2, Activity, Filter,
  MapPinOff, Navigation, ZoomIn, ZoomOut, Layers, ExternalLink
} from 'lucide-react';

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

const GOOGLE_HYBRID_URL = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
const SATELLITE_ATTRIBUTION = '&copy; Google Maps';

const SYSTEM_DATA: Record<string, string[]> = {
  "5ª BRITAGEM": ["bm-1080ks-11", "bm-1080ks-12", "bm-1080ks-13", "tr-1080ks-80", "tr-1080ks-81", "tr-1080ks-82", "tr-1080ks-83", "tr-1080ks-84", "tr-1080ks-85", "tr-1080ks-86", "tr-1080ks-87", "tr-1080ks-88", "tr-1085ks-36"],
  "CASA DE TRANSFERENCIA": ["ee-1084ks-01", "se-1082ks-01", "se-1082ks-02", "se-1082ks-03", "se-1082ks-04", "se-1083ks-01", "se-1084ks-01", "se-1085ks-22", "se-1085ks-23", "se-6021ks-01", "tr-1080ks-37", "tr-1082ks-01", "tr-1082ks-02", "tr-1082ks-03", "tr-1082ks-04", "tr-1082ks-05", "tr-1082ks-06", "tr-1083ks-01", "tr-1084ks-01", "tr-1085ks-01", "tr-1085ks-04", "tr-1085ks-05"],
  "OVERLAND": ["ee-1083ks-01", "ee-1084ks-01", "se-1083ks-02", "se-1084ks-02", "se-1084ks-21", "se-1084ks-22", "tr-1083ks-02", "tr-1083ks-03", "tr-1083ks-04", "tr-1084ks-02"],
  "SISTEMA 1": ["vc-1080ks-13.06", "bm-1080ks-04", "se-1081ks-03", "se-1081ks-13", "se-1081ks-17", "se-1081ks-74", "se-1082ks-95", "tr-1081ks-03", "tr-1082ks-13"],
  "SISTEMA 2": ["ee-1080ks-02", "bm-1081ks-02", "se-1080ks-51", "se-1081ks-14", "se-1081ks-18", "se-1081ks-27", "se-1081ks-50", "se-1081ks-51", "se-1081ks-52", "se-1081ks-56", "se-1081ks-76", "se-1081ks-97", "tr-1081ks-04", "tr-1081ks-05", "tr-1081ks-14", "tr-1081ks-52"],
  "SISTEMA 3": ["ee-1081ks-03", "bm-1081ks-03", "se-1081ks-01", "se-1081ks-11", "se-1081ks-15", "se-1081ks-21", "se-1081ks-70", "se-1081ks-91", "tr-1081ks-01", "tr-1081ks-11"],
  "SISTEMA 4": ["ee-1081ks-01", "bm-1081ks-01", "se-1081ks-02", "se-1081ks-12", "se-1081ks-23", "se-1081ks-72", "se-1081ks-93", "tr-1081ks-02", "tr-1081ks-12"]
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
        <span key={i} className="bg-blue-500/40 text-blue-50 rounded px-0.5 font-bold shadow-sm">{part}</span>
      ) : part)}
    </span>
  );
};

const cleanTagName = (tag: string) => {
  if (!tag) return "";
  return tag.split('|')[0].trim();
};

const isKeyVisible = (k: string) => {
  if (!k) return false;
  const key = k.toUpperCase();
  return !key.includes('__EMPTY') && !key.includes('GEOLOCALIZAÇÃO') && !key.includes('LINK MAPS') && k.trim() !== "";
};

const removeEmptyKeys = (data: Record<string, any>) => {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach(key => {
    if (key.includes('__EMPTY')) {
      delete cleaned[key];
    }
  });
  return cleaned;
};

const MiniMapPreview: React.FC<{ lat: number, lng: number, tag: string, height?: string, className?: string }> = ({ lat, lng, tag, height = "h-64", className = "" }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    if (mapInstance.current) {
        mapInstance.current.setView([lat, lng], 18);
        return;
    }
    try {
      const map = L.map(mapRef.current, { 
        zoomControl: false, 
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false
      }).setView([lat, lng], 18);
      L.tileLayer(GOOGLE_HYBRID_URL, { 
        attribution: SATELLITE_ATTRIBUTION,
        maxZoom: 21,
        maxNativeZoom: 19
      }).addTo(map);
      L.circleMarker([lat, lng], {
        radius: 8, fillColor: '#3b82f6', color: '#ffffff', weight: 3, opacity: 1, fillOpacity: 1
      }).addTo(map);
      mapInstance.current = map;
      setTimeout(() => map.invalidateSize(), 300);
    } catch (e) { console.error("MiniMap error:", e); }
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [lat, lng, tag]);

  return (
    <div className={`relative group/map overflow-hidden rounded-2xl border border-slate-700/50 shadow-2xl ${className}`}>
      <div ref={mapRef} className={`w-full ${height} relative z-0`} />
      <div className="absolute inset-0 pointer-events-none border-[1px] border-white/5 z-10 rounded-2xl"></div>
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,4px_100%] z-20 opacity-20"></div>
    </div>
  );
};

const GlobalMapModal: React.FC<{ items: GroupItem[], onClose: () => void, onSelectItem: (item: GroupItem) => void }> = ({ items, onClose, onSelectItem }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setAccuracy(pos.coords.accuracy);
      },
      (err) => console.debug("GPS erro:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || typeof L === 'undefined') return;
    try {
      const map = L.map(mapRef.current, { 
        zoomControl: false, 
        tap: true,
        fadeAnimation: true,
        markerZoomAnimation: true
      }).setView([-15.7801, -47.9292], 4);
      
      L.tileLayer(GOOGLE_HYBRID_URL, { 
        attribution: SATELLITE_ATTRIBUTION,
        maxZoom: 21, 
        maxNativeZoom: 19,
        updateWhenIdle: true,
        keepBuffer: 8
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
      
      setTimeout(() => {
        if(mapInstance.current) mapInstance.current.invalidateSize();
      }, 300);
    } catch (e) { console.error("Map init error:", e); }
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current) return;
    
    if (userPos) {
      if (!userMarkerRef.current) {
        accuracyCircleRef.current = L.circle(userPos, { radius: accuracy || 0, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1 }).addTo(mapInstance.current);
        userMarkerRef.current = L.circleMarker(userPos, { radius: 8, fillColor: '#3b82f6', color: '#ffffff', weight: 3, opacity: 1, fillOpacity: 1, className: 'user-marker-pulse' }).addTo(mapInstance.current);
        userMarkerRef.current.bindTooltip("Você está aqui", { direction: 'top' });
      } else {
        userMarkerRef.current.setLatLng(userPos);
        accuracyCircleRef.current.setLatLng(userPos).setRadius(accuracy || 0);
      }
    }

    layerGroupRef.current.clearLayers();
    const bounds = L.latLngBounds([]);
    let hasBounds = false;

    items.forEach(item => {
      const geo = item.data?.["Geolocalização"];
      if (geo) {
        const parts = geo.split(',').map((p: string) => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const [lat, lng] = parts;
          let color = '#3b82f6';
          if (item.groupType === 'telecom') color = '#6366f1';
          if (item.groupType === 'painel') color = '#f97316';
          if (item.groupType === 'embarcados') color = '#10b981';
          
          const marker = L.circleMarker([lat, lng], { radius: 10, fillColor: color, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1 });
          const tagClean = cleanTagName(item.data?.["Tag"] || "Item");
          marker.bindTooltip(tagClean, { permanent: true, direction: 'top', className: 'tag-label', offset: [0, -8] });
          
          const popup = L.popup().setContent(`
            <div class="p-3 flex flex-col gap-3 min-w-[160px]">
              <div class="border-b border-slate-200 pb-2">
                <p class="text-[11px] font-black uppercase text-slate-800 tracking-tight">${tagClean}</p>
                <p class="text-[8px] font-bold text-slate-500 uppercase">${item.groupType || 'Ativo'}</p>
              </div>
              <div class="flex flex-col gap-1.5">
                <button onclick="window.handleSelectFromMap('${item.id}', '${item.groupType}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-lg text-[9px] font-black uppercase shadow-md transition-all active:scale-95">Ver no Painel</button>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" class="w-full bg-slate-800 text-white px-3 py-2.5 rounded-lg text-[9px] font-black text-center no-underline uppercase shadow-sm">Como Chegar</a>
              </div>
            </div>
          `);
          marker.bindPopup(popup);
          layerGroupRef.current.addLayer(marker);
          bounds.extend([lat, lng]);
          hasBounds = true;
        }
      }
    });

    if (hasBounds && items.length > 0) {
      mapInstance.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 18 });
    }
    
    (window as any).handleSelectFromMap = (id: string, group: string) => {
        onSelectItem(items.find(i => i.id === id)!);
        onClose();
    };
  }, [items, userPos, accuracy]);

  const handleZoomIn = () => mapInstance.current?.zoomIn();
  const handleZoomOut = () => mapInstance.current?.zoomOut();
  const handleRecenter = () => {
      if (userPos) mapInstance.current?.setView(userPos, 19, { animate: true });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 w-full h-[100vh] sm:h-[90vh] sm:max-w-6xl sm:rounded-[3rem] overflow-hidden flex flex-col border border-slate-700 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        <div className="p-5 sm:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/90 backdrop-blur-xl relative z-20">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl ring-1 ring-blue-500/20"><Globe className="w-6 h-6" /></div>
             <div>
                <h3 className="font-black text-white text-lg tracking-tighter uppercase leading-none">Rastreio Satélite Profissional</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sincronizado com Google Hybrid API</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 rounded-2xl text-slate-400 transition-all active:scale-90"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 relative bg-slate-950">
            <div ref={mapRef} className="absolute inset-0 z-0" />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
                <button onClick={handleZoomIn} className="p-4 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl text-white shadow-2xl hover:bg-slate-700 transition-all active:scale-90"><ZoomIn size={24} /></button>
                <button onClick={handleZoomOut} className="p-4 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl text-white shadow-2xl hover:bg-slate-700 transition-all active:scale-90"><ZoomOut size={24} /></button>
                <button onClick={handleRecenter} className="p-4 bg-blue-600 border border-white/20 rounded-2xl text-white shadow-2xl hover:bg-blue-500 transition-all active:scale-90"><Crosshair size={24} /></button>
            </div>
            <div className="absolute bottom-8 left-8 z-10">
                <div className="px-5 py-3 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/5 flex items-center gap-4 shadow-2xl">
                    <div className={`w-3 h-3 rounded-full ${userPos ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-red-500 animate-pulse'}`}></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{userPos ? 'Sinal Ativo' : 'Buscando GPS...'}</span>
                        {accuracy && <span className="text-[8px] font-bold text-slate-500 uppercase mt-1">Precisão: {accuracy.toFixed(1)}m</span>}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const ItemDetail: React.FC<{ item: GroupItem; groupKey: string; config: any; user: User; onClose: () => void; onDelete: (id: string) => void; }> = ({ item, groupKey, config, user, onClose, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>(() => removeEmptyKeys(item.data || {}));
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(() => {
     if (item.data?.["Geolocalização"]) {
         const parts = item.data["Geolocalização"].split(',');
         if (parts.length === 2) return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
     }
     return null;
  });
  const [gettingLocation, setGettingLocation] = useState(false);
  const showGPSFeature = groupKey === 'painel';

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const docRef = doc(db, groupKey, item.id);
          let finalData = removeEmptyKeys(editData);
          if (finalData["Tag"]) finalData["Tag"] = cleanTagName(finalData["Tag"]);
          
          if (location && showGPSFeature) {
              finalData["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
              finalData["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
          } else {
              finalData["Geolocalização"] = "";
              finalData["Link Maps"] = "";
          }
          await updateDoc(docRef, { data: finalData, content: `Item: ${finalData["Tag"] || item.content}` });
          setIsEditing(false);
      } catch (e) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const handleDirections = () => {
    if (location) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`, '_blank');
    }
  };

  return (
      <div className="bg-slate-900 min-h-screen sm:min-h-[600px] sm:rounded-[2.5rem] border-x sm:border border-slate-700 shadow-2xl overflow-hidden flex flex-col animate-slideUp">
          <div className={`p-5 sm:p-8 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-30 shadow-xl`}>
              <div className="flex items-center gap-4">
                  <button onClick={onClose} className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all"><ArrowLeft className="w-5 h-5" /></button>
                  <h2 className="text-xl font-black uppercase truncate tracking-tight">{isEditing ? "Edição de Ativo" : (cleanTagName(editData["Tag"]) || "Detalhes do Ativo")}</h2>
              </div>
              <div className="flex gap-2">
                 {!isEditing && <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white/20 rounded-lg text-xs font-black uppercase transition-all hover:bg-white/30">Editar</button>}
                 <button onClick={() => confirm("Remover?") && onDelete(item.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg transition-all hover:bg-red-500/40"><Trash2 className="w-5 h-5" /></button>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-32">
              {showGPSFeature && (
                <div className="relative w-full h-[40vh] sm:h-[450px] bg-slate-950">
                  {location ? (
                    <MiniMapPreview 
                      lat={location.lat} 
                      lng={location.lng} 
                      tag={editData["Tag"]} 
                      height="h-full" 
                      className="rounded-none border-none shadow-none"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-4 bg-slate-900/50">
                      <MapPinOff size={64} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhuma localização sincronizada</p>
                    </div>
                  )}

                  <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none">
                    <div className="p-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${location ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-500'}`}><MapPin className="w-6 h-6" /></div>
                            <div>
                               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status do Satélite</h4>
                               <p className="text-sm text-slate-200 font-mono font-bold tracking-tight">{location ? `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}` : "COORD_NULL"}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 pointer-events-auto">
                        {!isEditing && location && (
                            <button onClick={handleDirections} className="p-4 bg-emerald-500 text-white rounded-2xl shadow-2xl active:scale-95 transition-all flex items-center gap-3 hover:bg-emerald-600">
                                <Navigation className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Traçar Rota</span>
                            </button>
                        )}
                        {isEditing && (
                             <button onClick={() => { setGettingLocation(true); navigator.geolocation.getCurrentPosition(p => { setLocation({lat:p.coords.latitude, lng:p.coords.longitude}); setGettingLocation(false); }, () => setGettingLocation(false), {enableHighAccuracy:true}) }} className="p-4 bg-blue-600 text-white rounded-2xl shadow-2xl active:scale-95 transition-all flex items-center gap-3 hover:bg-blue-700">
                                {gettingLocation ? <Loader2 className="animate-spin w-5 h-5"/> : <Crosshair className="w-5 h-5"/>}
                                <span className="text-[10px] font-black uppercase tracking-widest">{gettingLocation ? "Escaneando..." : "Sincronizar"}</span>
                             </button>
                        )}
                        {isEditing && location && (
                            <button onClick={() => setLocation(null)} className="p-4 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/20 backdrop-blur-md transition-all hover:bg-red-500/40" title="Remover Localização">
                                <MapPinOff className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none"></div>
                </div>
              )}

              <div className="p-6 sm:p-10 space-y-10 relative z-20 -mt-10 sm:-mt-16">
                 <div className="bg-slate-800/80 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-slate-700/50 shadow-2xl space-y-8">
                    <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] flex items-center gap-3">
                        <Database className="w-4 h-4" /> Especificações Técnicas
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(editData).filter(([k]) => isKeyVisible(k)).map(([key, value]) => (
                            <div key={key} className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 group-hover:border-blue-500/30 transition-all">
                              <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">{key}</h5>
                              {isEditing ? (
                                <input type="text" value={String(value)} onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500 transition-all shadow-inner" />
                              ) : (
                                <p className="text-white font-black uppercase tracking-tight text-lg break-all">{String(value)}</p>
                              )}
                            </div>
                        ))}
                    </div>
                 </div>
              </div>
          </div>

          {isEditing && (
              <div className="fixed bottom-0 left-0 right-0 p-8 bg-slate-900/90 backdrop-blur-3xl border-t border-slate-800 z-40">
                <button onClick={handleSave} disabled={isSaving} className={`max-w-4xl mx-auto w-full py-6 rounded-2xl text-white font-black uppercase tracking-[0.2em] ${config.color} shadow-2xl flex justify-center items-center gap-4 transition-all active:scale-95 hover:brightness-110`}>
                    {isSaving ? <Loader2 className="animate-spin w-6 h-6"/> : <Save className="w-6 h-6"/>}
                    {isSaving ? "Gravando Dados..." : "Confirmar Alterações"}
                </button>
              </div>
          )}
      </div>
  );
};

const ItemCard: React.FC<{ item: GroupItem; config: any; onSelect: () => void; searchHighlight: string; }> = ({ item, config, onSelect, searchHighlight }) => {
  const data = item.data || {};
  const tagValue = cleanTagName(data["Tag"] || item.content.replace(/^Item:\s*/i, ''));
  const localValue = data["Local"] || "Não definido";
  const hasGeo = !!data["Geolocalização"] && data["Geolocalização"].trim() !== "";

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data["Geolocalização"]) {
      const [lat, lng] = data["Geolocalização"].split(',');
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat.trim()},${lng.trim()}`, '_blank');
    }
  };

  return (
    <div onClick={onSelect} className="relative flex flex-col bg-slate-800/40 backdrop-blur-xl rounded-3xl border border-slate-700/60 transition-all cursor-pointer active:scale-95 group overflow-hidden hover:bg-slate-800/60 hover:border-blue-500/30 shadow-xl">
      
      {config.id === 'painel' && hasGeo && (
        <div className="w-full h-40 relative overflow-hidden bg-slate-950 border-b border-white/5">
           <MiniMapPreview 
            lat={parseFloat(data["Geolocalização"].split(',')[0])} 
            lng={parseFloat(data["Geolocalização"].split(',')[1])} 
            tag={tagValue} 
            height="h-full" 
            className="rounded-none border-none opacity-80 group-hover:opacity-100 transition-opacity" 
           />
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none"></div>
           <div className="absolute bottom-3 right-3 z-10">
                <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-2xl">
                    <Navigation2 className="w-4 h-4" />
                </div>
           </div>
        </div>
      )}

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-black text-white truncate tracking-tighter uppercase leading-tight">
                <HighlightedText text={tagValue} highlight={searchHighlight} />
            </h3>
            {hasGeo && config.id !== 'painel' && (
                <button onClick={handleDirections} className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all active:scale-90 shadow-sm" title="Como Chegar">
                    <Navigation2 className="w-4 h-4" />
                </button>
            )}
        </div>

        <div className="flex items-center gap-3 text-slate-400 bg-slate-900/60 px-4 py-3 rounded-2xl border border-white/5 shadow-inner">
          <MapPin className={`w-4 h-4 ${hasGeo ? 'text-emerald-500' : 'text-slate-600'}`} />
          <span className="text-[10px] font-black truncate uppercase tracking-widest opacity-90">{localValue}</span>
        </div>

        {config.id === 'painel' && (
          <div className="grid grid-cols-1 gap-2">
            {['Switch1', 'Switch2', 'Switch3'].map((swKey, idx) => (
              data[swKey] && (
                <div key={swKey} className="flex items-center gap-3 px-3 py-2 bg-slate-900/40 border border-white/5 rounded-xl">
                  <Server className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[9px] font-black text-slate-300 font-mono uppercase truncate tracking-tight">PORT-0{idx + 1}: {data[swKey]}</span>
                </div>
              )
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[8px] font-black text-slate-500 pt-4 border-t border-white/5 uppercase tracking-[0.2em]">
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${hasGeo ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`}></div>
             {config.label}
           </div>
           <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
               DETALHES <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
           </div>
        </div>
      </div>
    </div>
  );
};

const GroupPage: React.FC<{ groupKey: GroupType; user: User; onBack: () => void; initialSelectedItem?: GroupItem | null }> = ({ groupKey, user, onBack, initialSelectedItem }) => {
  const config = groupsConfig[groupKey];
  const [items, setItems] = useState<GroupItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GroupItem | null>(initialSelectedItem || null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '' });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const showGPSInput = groupKey === 'painel';

  useEffect(() => {
    const q = query(collection(db, groupKey));
    return onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as GroupItem[]));
  }, [groupKey]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalTag = cleanTagName(formData.tag);
      const finalLocal = formData.local === "NOVO" ? formData.customLocal : formData.local;
      const finalEquip = formData.equipamento === "NOVO" ? formData.customEquipamento : formData.equipamento;
      
      let data: any = { "Tag": finalTag, "Local": finalLocal };
      if (groupKey === 'painel') data = { ...data, "Switch1": formData.switch1, "Switch2": formData.switch2, "Switch3": formData.switch3, "Equipamento": finalEquip };
      else data = { ...data, "IP": formData.ip };
      
      data = removeEmptyKeys(data);

      if (location && showGPSInput) {
        data["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
        data["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      }
      
      await addDoc(collection(db, groupKey), { content: `Item: ${finalTag}`, data, userId: user.uid, userEmail: user.email, createdAt: serverTimestamp() });
      setIsModalOpen(false);
      setFormData({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '' });
      setLocation(null);
    } catch (e) { alert('Erro'); } finally { setLoading(false); }
  };

  const filteredItems = items
    .filter(i => {
      const s = searchTerm.toLowerCase().trim();
      const tag = cleanTagName(i.data?.["Tag"] || i.content).toLowerCase();
      const searchableData = Object.entries(i.data || {})
        .filter(([k]) => isKeyVisible(k))
        .map(([_, v]) => String(v).toLowerCase());
        
      return tag.includes(s) || searchableData.some(val => val.includes(s));
    })
    .sort((a, b) => {
      const tagA = cleanTagName(a.data?.["Tag"] || a.content || "").toLowerCase();
      const tagB = cleanTagName(b.data?.["Tag"] || b.content || "").toLowerCase();
      return tagA.localeCompare(tagB, undefined, { numeric: true, sensitivity: 'base' });
    });

  if (selectedItem) return <ItemDetail item={selectedItem} groupKey={groupKey} config={config} user={user} onClose={() => setSelectedItem(null)} onDelete={(id) => deleteDoc(doc(db, groupKey, id)).then(() => setSelectedItem(null))} />;

  return (
    <div className="pb-24 animate-fadeIn">
      <div className="p-8 sm:p-14 mb-10 bg-slate-800/60 rounded-[3.5rem] border border-slate-700 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-5 bg-slate-700 rounded-[1.75rem] text-slate-300 hover:bg-slate-600 transition-all active:scale-90 shadow-lg"><ArrowLeft size={32} /></button>
            <div>
              <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase leading-none">{config.label}</h2>
              <span className="text-[11px] uppercase font-black text-slate-500 mt-3 block tracking-[0.4em] opacity-80">Infraestrutura Operacional</span>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className={`hidden lg:flex px-10 py-5 rounded-2xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[12px] tracking-widest items-center gap-3 shadow-2xl transition-all active:scale-95 hover:brightness-110`}>
            <Plus size={24} /> Novo Ativo
          </button>
        </div>
      </div>

      <div className="relative mb-12 group max-w-5xl mx-auto">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
        <input type="text" placeholder={`Filtrar por tag, identificador ou localização...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-16 pr-10 py-7 bg-slate-800/80 border border-slate-700 rounded-[3rem] text-white text-xl outline-none font-black placeholder-slate-600 shadow-2xl focus:border-blue-500 transition-all backdrop-blur-md" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
        {filteredItems.map(item => <ItemCard key={item.id} item={item} config={config} onSelect={() => setSelectedItem(item)} searchHighlight={searchTerm} />)}
      </div>

      <button onClick={() => setIsModalOpen(true)} className={`fixed bottom-12 right-12 w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-50 bg-gradient-to-r ${config.gradient} transition-all border-2 border-white/20 active:scale-90 hover:scale-105`}><Plus size={48} /></button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
          <div className="bg-slate-800 w-full h-[95vh] sm:h-auto sm:max-w-xl sm:rounded-[3.5rem] border-t sm:border border-slate-600 overflow-y-auto shadow-2xl">
            <div className={`p-8 sm:p-10 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10 shadow-2xl`}>
              <h3 className="text-2xl font-black uppercase tracking-tight">Registro de Ativo</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"><X size={28} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 sm:p-10 space-y-8 pb-16">
              {showGPSInput && (
                <div className="space-y-4">
                  <button type="button" onClick={() => { setGettingLocation(true); navigator.geolocation.getCurrentPosition(p => { setLocation({lat: p.coords.latitude, lng: p.coords.longitude}); setGettingLocation(false); }, () => setGettingLocation(false), {enableHighAccuracy: true}) }} className="w-full py-6 bg-slate-700 border border-slate-600 rounded-3xl text-[11px] font-black uppercase text-blue-400 flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl group/btn">
                    {gettingLocation ? <Loader2 className="animate-spin" size={24}/> : location ? <CheckCircle className="text-emerald-500" size={24}/> : <Crosshair size={24}/>}
                    {location ? "SATÉLITE SINCRONIZADO" : "CAPTURAR COORDENADAS GPS"}
                  </button>
                  {location && <MiniMapPreview lat={location.lat} lng={location.lng} tag={formData.tag} height="h-48" />}
                </div>
              )}
              <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase ml-4 tracking-[0.3em]">Tag de Identificação</label>
                    <input type="text" placeholder="Ex: vc-1080ks-13.06" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-7 py-5 bg-slate-700/50 border border-slate-600 rounded-3xl text-white text-lg font-black outline-none focus:border-blue-500 transition-all shadow-inner" />
                </div>
                
                {groupKey === 'painel' ? (
                   <div className="space-y-4">
                     <div className="grid grid-cols-1 gap-3">
                        {['switch1', 'switch2', 'switch3'].map((sw, i) => <input key={sw} type="text" placeholder={`Porta de Conexão Switch 0${i+1}`} value={formData[sw]} onChange={e => setFormData({...formData, [sw]: e.target.value})} className="w-full px-6 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-sm font-mono outline-none focus:border-blue-500 transition-all shadow-inner" />)}
                     </div>
                     <select value={formData.local} onChange={e => setFormData({...formData, local: e.target.value, equipamento: ''})} className="w-full px-6 py-5 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-sm font-black uppercase outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                        <option value="">Selecione Localização Técnica...</option>
                        {Object.keys(SYSTEM_DATA).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        <option value="NOVO">+ NOVO LOCAL OPERACIONAL</option>
                     </select>
                     <select disabled={!formData.local} value={formData.equipamento} onChange={e => setFormData({...formData, equipamento: e.target.value})} className="w-full px-6 py-5 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-sm font-black uppercase outline-none focus:border-blue-500 transition-all disabled:opacity-30 appearance-none cursor-pointer">
                        <option value="">Selecione Ativo Relacionado...</option>
                        {formData.local && SYSTEM_DATA[formData.local]?.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                        <option value="NOVO">+ NOVO ATIVO PERSONALIZADO</option>
                     </select>
                   </div>
                ) : (
                   <div className="space-y-4">
                     <input type="text" placeholder="Localização Geográfica/Técnica" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-7 py-5 bg-slate-700/50 border border-slate-600 rounded-3xl text-white text-sm font-black uppercase outline-none focus:border-blue-500 transition-all" />
                     <input type="text" placeholder="Endereço IP / Hostname / ID" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} className="w-full px-7 py-5 bg-slate-700/50 border border-slate-600 rounded-3xl text-white text-sm font-mono outline-none focus:border-blue-500 transition-all" />
                   </div>
                )}
              </div>
              <button type="submit" disabled={loading} className={`w-full py-7 rounded-[2.5rem] text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[14px] tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 hover:brightness-110`}>
                 {loading ? <Loader2 className="animate-spin" size={28}/> : "FINALIZAR CADASTRO"}
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
  const [allData, setAllData] = useState<GroupItem[]>([]);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);
  const [itemFromSearch, setItemFromSearch] = useState<GroupItem | null>(null);

  useEffect(() => {
    const colls = ['ctv', 'telecom', 'painel', 'embarcados'];
    const unsubs = colls.map((c, idx) => 
      onSnapshot(collection(db, c), (snap) => {
        const newItems = snap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(), 
          groupType: colls[idx] as GroupType 
        } as GroupItem));
        setAllData(prev => {
          const other = prev.filter(i => i.groupType !== colls[idx]);
          return [...other, ...newItems];
        });
      })
    );
    return () => unsubs.forEach(u => u());
  }, []);

  const handleOpenGlobalMap = async () => {
    setLoadingMap(true);
    try {
      setIsMapModalOpen(true);
    } catch (e) { console.error(e); } finally { setLoadingMap(false); }
  };

  if (currentView !== 'home') return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-12">
        <div className="max-w-7xl mx-auto">
            <GroupPage 
                groupKey={currentView} 
                user={user} 
                onBack={() => { setCurrentView('home'); setItemFromSearch(null); }} 
                initialSelectedItem={itemFromSearch} 
            />
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 p-6 sm:p-20 text-white relative flex flex-col">
      <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>
      
      {isMapModalOpen && <GlobalMapModal items={allData} onClose={() => setIsMapModalOpen(false)} onSelectItem={(item) => { setItemFromSearch(item); setCurrentView(item.groupType as GroupType); }} />}
      
      <div className="max-w-7xl mx-auto w-full space-y-16 animate-fadeIn relative z-10 flex-1">
        <header className="flex flex-col gap-12">
          <div className="flex justify-between items-center">
            <div className="inline-flex items-center gap-4 px-6 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.5em] text-blue-400 shadow-2xl">
               TAGFINDER ENTERPRISE V6.0 <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <button onClick={() => signOut(auth)} className="p-5 bg-slate-800 border border-slate-700 rounded-3xl text-slate-500 hover:text-red-500 transition-all shadow-2xl active:scale-90"><LogOut size={28} /></button>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
            <div>
              <h1 className="text-5xl sm:text-8xl font-black tracking-tighter uppercase leading-none">Status, <br/><span className="text-blue-500 drop-shadow-2xl">{user.email?.split('@')[0]}</span></h1>
              <p className="text-slate-500 text-sm sm:text-lg font-bold uppercase tracking-[0.3em] mt-8 opacity-70 italic border-l-4 border-blue-500 pl-6">Monitoramento Georreferenciado e Gestão de Ativos Industriais</p>
            </div>
            
            <button onClick={handleOpenGlobalMap} disabled={loadingMap} className="group bg-slate-800/80 p-10 sm:p-16 rounded-[4.5rem] border border-slate-700 shadow-2xl hover:border-blue-500/40 transition-all active:scale-[0.98] text-left relative overflow-hidden flex items-center gap-12">
               <div className="absolute top-0 right-0 p-40 bg-blue-600/10 rounded-full blur-[120px] -mr-20 -mt-20"></div>
               <div className="p-8 bg-blue-500/10 text-blue-400 rounded-[2.5rem] group-hover:scale-110 transition-all shadow-xl relative z-10 ring-[12px] ring-white/5">
                  {loadingMap ? <Loader2 className="animate-spin" size={48}/> : <Globe size={48} />}
               </div>
               <div className="relative z-10">
                  <h3 className="text-3xl sm:text-4xl font-black uppercase text-white leading-none tracking-tight">Painel Satélite</h3>
                  <p className="text-[11px] font-black text-slate-500 uppercase mt-4 tracking-[0.4em]">Visão Estratégica Híbrida em Tempo Real</p>
               </div>
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-24">
            {Object.entries(groupsConfig).map(([key, group]) => (
            <button key={key} onClick={() => setCurrentView(key as GroupType)} className="relative overflow-hidden group bg-slate-900/60 p-14 rounded-[4rem] border border-slate-800/80 flex flex-col items-start transition-all hover:bg-slate-800 hover:border-white/10 active:scale-95 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
                <div className={`w-24 h-24 rounded-[2rem] ${group.lightColor} ${group.textColor} flex items-center justify-center mb-12 border border-white/5 transition-all group-hover:scale-110 shadow-2xl ring-8 ring-white/5`}><group.icon size={44} /></div>
                <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-5">{group.label}</h2>
                <div className={`inline-flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] ${group.textColor} opacity-60 group-hover:opacity-100 transition-opacity`}>EXPLORAR <ArrowRight size={18} /></div>
            </button>
            ))}
        </section>
      </div>

      <footer className="py-20 text-center border-t border-white/5 mt-auto">
        <p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.6em] opacity-40">TagFinder Pro Infrastructure &copy; 2024 • Intelligence for Industrial Assets</p>
      </footer>
    </div>
  );
};

export default Dashboard;
