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
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { 
  LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, 
  MapPin, Loader2, X, Globe, Trash2, Crosshair, 
  Server, CheckCircle, Database, Clock, Navigation2, Activity, Filter,
  MapPinOff, Navigation, ZoomIn, ZoomOut, Layers, ExternalLink, MessageSquare, Locate, FilterX,
  Edit, ChevronRight
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
        <mark key={i} className="bg-blue-500/40 text-white rounded px-0.5 font-bold shadow-sm inline-block">{part}</mark>
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
        maxZoom: 22
      }).addTo(map);
      L.circleMarker([lat, lng], {
        radius: 6, fillColor: '#3b82f6', color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1
      }).addTo(map);
      mapInstance.current = map;
      setTimeout(() => map.invalidateSize(), 300);
    } catch (e) { console.error("MiniMap error:", e); }
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [lat, lng, tag]);

  return (
    <div className={`relative group/map overflow-hidden rounded-2xl border border-slate-700 shadow-2xl ${className}`}>
      <div ref={mapRef} className={`w-full ${height} relative z-0`} />
      <div className="absolute inset-0 pointer-events-none border-[1px] border-white/5 z-10 rounded-2xl"></div>
    </div>
  );
};

const GlobalMapModal: React.FC<{ items: GroupItem[], onClose: () => void, onSelectItem: (item: GroupItem) => void }> = ({ items, onClose, onSelectItem }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const assetsLayerRef = useRef<any>(null);
  const userLayerRef = useRef<any>(null);
  const initialFitDone = useRef(false);
  
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
    if (!mapRef.current || typeof L === 'undefined') return;
    
    try {
      const map = L.map(mapRef.current, { 
        zoomControl: false, 
        tap: true,
        fadeAnimation: true,
        markerZoomAnimation: true
      }).setView([-15.7801, -47.9292], 4);
      
      L.tileLayer(GOOGLE_HYBRID_URL, { 
        attribution: SATELLITE_ATTRIBUTION,
        maxZoom: 22, 
        updateWhenIdle: true
      }).addTo(map);

      assetsLayerRef.current = L.layerGroup().addTo(map);
      userLayerRef.current = L.layerGroup().addTo(map);
      
      mapInstance.current = map;
      
      setTimeout(() => {
        if(mapInstance.current) mapInstance.current.invalidateSize();
      }, 400);
    } catch (e) { console.error("Map init error:", e); }

    return () => {
        if (mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
        }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !userLayerRef.current || !userPos) return;

    if (!userMarkerRef.current) {
      accuracyCircleRef.current = L.circle(userPos, { 
        radius: accuracy || 0, 
        color: '#3b82f6', 
        fillColor: '#3b82f6', 
        fillOpacity: 0.15, 
        weight: 1 
      }).addTo(userLayerRef.current);
      
      userMarkerRef.current = L.circleMarker(userPos, { 
        radius: 10, 
        fillColor: '#3b82f6', 
        color: '#ffffff', 
        weight: 3, 
        opacity: 1, 
        fillOpacity: 1, 
        className: 'user-marker-pulse' 
      }).addTo(userLayerRef.current);
      
      userMarkerRef.current.bindTooltip("Você", { direction: 'top' });
    } else {
      userMarkerRef.current.setLatLng(userPos);
      accuracyCircleRef.current.setLatLng(userPos).setRadius(accuracy || 0);
    }
  }, [userPos, accuracy]);

  useEffect(() => {
    if (!mapInstance.current || !assetsLayerRef.current || items.length === 0) return;

    assetsLayerRef.current.clearLayers();
    const bounds = L.latLngBounds([]);
    let hasGeoItems = false;

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
          
          const marker = L.circleMarker([lat, lng], { 
            radius: 9, 
            fillColor: color, 
            color: '#ffffff', 
            weight: 2, 
            opacity: 1, 
            fillOpacity: 1 
          });
          
          const tagClean = cleanTagName(item.data?.["Tag"] || "Item");
          marker.bindTooltip(tagClean, { 
            permanent: true, 
            direction: 'top', 
            className: 'tag-label', 
            offset: [0, -8] 
          });
          
          const popupContent = document.createElement('div');
          popupContent.className = "p-3 flex flex-col gap-3 min-w-[160px]";
          popupContent.innerHTML = `
            <div class="border-b border-slate-200 pb-2">
              <p class="text-[11px] font-black uppercase text-slate-800 tracking-tight">${tagClean}</p>
              <p class="text-[8px] font-bold text-slate-500 uppercase">${item.groupType || 'Ativo'}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <button id="btn-select-${item.id}" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase shadow-md transition-all active:scale-95">Visualizar Dados</button>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" class="w-full bg-slate-800 text-white px-3 py-2 rounded-lg text-[9px] font-black text-center no-underline uppercase shadow-sm">Traçar Rota</a>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.on('popupopen', () => {
            const btn = document.getElementById(`btn-select-${item.id}`);
            if (btn) btn.onclick = () => { onSelectItem(item); onClose(); };
          });

          assetsLayerRef.current.addLayer(marker);
          bounds.extend([lat, lng]);
          hasGeoItems = true;
        }
      }
    });

    if (hasGeoItems && !initialFitDone.current) {
        if (userPos) bounds.extend(userPos);
        mapInstance.current.fitBounds(bounds, { padding: [100, 100], maxZoom: 18 });
        initialFitDone.current = true;
    }
  }, [items]);

  const handleZoomIn = () => mapInstance.current?.zoomIn();
  const handleZoomOut = () => mapInstance.current?.zoomOut();
  const handleRecenter = () => {
      if (userPos) mapInstance.current?.setView(userPos, 19, { animate: true });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 w-full h-[100vh] sm:h-[90vh] sm:max-w-6xl sm:rounded-[2.5rem] overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur-xl relative z-20">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shadow-lg"><Globe className="w-5 h-5" /></div>
             <div>
                <h3 className="font-black text-white text-base tracking-tighter uppercase leading-none">Painel Satélite</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Google Hybrid Infrastructure</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-xl text-slate-400 transition-all active:scale-90 shadow-md border border-slate-700"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 relative bg-slate-950">
            <div ref={mapRef} className="absolute inset-0 z-0" />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
                <button onClick={handleZoomIn} className="p-4 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[1.25rem] text-white shadow-2xl active:scale-90 hover:bg-slate-800 transition-all"><ZoomIn size={22} /></button>
                <button onClick={handleZoomOut} className="p-4 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[1.25rem] text-white shadow-2xl active:scale-90 hover:bg-slate-800 transition-all"><ZoomOut size={22} /></button>
                <button onClick={handleRecenter} className="p-4 bg-blue-600 border border-blue-400/50 rounded-[1.25rem] text-white shadow-2xl active:scale-90 hover:bg-blue-500 transition-all"><Locate size={22} /></button>
            </div>
            <div className="absolute bottom-6 left-6 z-10">
                <div className="px-5 py-3.5 bg-slate-900/90 backdrop-blur-2xl rounded-[1.25rem] border border-white/5 flex items-center gap-3 shadow-2xl">
                    <div className={`w-3 h-3 rounded-full ${userPos ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.15em] leading-none">{userPos ? 'GPS Conectado' : 'Localizando...'}</span>
                </div>
            </div>
            <style>{`
                .user-marker-pulse { animation: map-pulse 2.5s infinite; }
                @keyframes map-pulse {
                    0% { stroke-width: 2px; stroke: #fff; r: 10; }
                    50% { stroke-width: 18px; stroke: rgba(59, 130, 246, 0.4); r: 15; }
                    100% { stroke-width: 2px; stroke: #fff; r: 10; }
                }
                .tag-label {
                  background: rgba(15, 23, 42, 0.95);
                  backdrop-filter: blur(8px);
                  border: 1px solid rgba(59, 130, 246, 0.6);
                  color: white;
                  font-weight: 900;
                  font-size: 9px;
                  text-transform: uppercase;
                  border-radius: 4px;
                  padding: 3px 10px;
                  box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.6);
                  letter-spacing: 0.05em;
                }
            `}</style>
        </div>
      </div>
    </div>
  );
};

/* ItemCard component for displaying asset summaries in the grid */
const ItemCard: React.FC<{ item: GroupItem; config: any; onSelect: () => void; searchHighlight: string; }> = ({ item, config, onSelect, searchHighlight }) => {
  const data = item.data || {};
  const tagValue = cleanTagName(data["Tag"] || item.content.replace(/^Item:\s*/i, ''));
  const localValue = data["Local"] || "S/ LOCAL";
  const hasGeo = !!data["Geolocalização"];
  const isPainel = config.id === 'painel';

  return (
    <div onClick={onSelect} className="relative flex flex-col bg-slate-800/40 backdrop-blur-xl rounded-[1.5rem] border border-slate-700/60 p-1 shadow-lg hover:shadow-2xl transition-all cursor-pointer active:scale-95 group overflow-hidden">
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-black text-white truncate tracking-tighter uppercase group-hover:text-blue-400 transition-colors">
            <HighlightedText text={tagValue} highlight={searchHighlight} />
          </h3>
          <div className={`p-2 rounded-lg ${hasGeo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-500'}`}>
            <MapPin size={14} />
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-slate-400 bg-slate-900/40 px-3 py-2 rounded-xl border border-white/5">
          <span className="text-[9px] font-black truncate tracking-widest uppercase">{localValue}</span>
        </div>
        
        {isPainel && (
            <div className="space-y-2">
                {data["Equipamento"] && (
                    <div className="px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded text-[8px] text-orange-400 font-black uppercase tracking-tighter truncate">
                        {data["Equipamento"]}
                    </div>
                )}
                <div className="flex flex-wrap gap-1">
                    {['Switch1', 'Switch2', 'Switch3'].map(swKey => data[swKey] && (
                        <div key={swKey} className="flex items-center gap-1 px-2 py-0.5 bg-slate-700/30 rounded text-[7px] text-slate-300 font-bold border border-white/5">
                            <Activity className="w-2.5 h-2.5 text-blue-400" />
                            <span className="uppercase">{swKey.slice(-1)}: {data[swKey]}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="flex items-center justify-between text-[8px] font-black text-slate-500 pt-3 border-t border-white/5 uppercase tracking-[0.2em]">
           <div className="flex items-center gap-1.5">
             <div className={`w-1.5 h-1.5 rounded-full ${hasGeo ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-slate-600'}`}></div>
             {config.label}
           </div>
           <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};

/* ItemDetail component for detailed view and editing of an asset */
const ItemDetail: React.FC<{ item: GroupItem; groupKey: string; config: any; user: User; onClose: () => void; onDelete: (id: string) => void; }> = ({ item, groupKey, config, user, onClose, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>(() => {
    const filtered: Record<string, any> = {};
    Object.entries(item.data || {}).forEach(([k, v]) => {
      if (isKeyVisible(k)) filtered[k] = v;
    });
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
      () => { setGettingLocation(false); alert('GPS FALHOU.'); },
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
          }
          await updateDoc(docRef, { data: finalData, content: finalData["Tag"] ? `Item: ${finalData["Tag"]}` : item.content });
          setIsEditing(false);
      } catch (e) { alert("ERRO AO SALVAR."); } finally { setIsSaving(false); }
  };

  return (
      <div className="bg-slate-900 min-h-screen sm:min-h-[600px] sm:rounded-[3rem] border-x sm:border border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
          <div className={`p-6 sm:p-10 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-20 shadow-xl`}>
              <div className="flex items-center gap-5">
                  <button onClick={onClose} className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-all active:scale-90 shadow-lg"><ArrowLeft size={24} /></button>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tighter uppercase truncate max-w-[200px] sm:max-w-none">{isEditing ? "EDITANDO REGISTRO" : cleanTagName(editData["Tag"] || "DETALHES")}</h2>
                    <span className="text-[9px] font-black uppercase opacity-70 tracking-widest">{config.label} • INVENTÁRIO</span>
                  </div>
              </div>
              {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="px-5 py-2.5 bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-white/30 shadow-lg">
                      <Edit className="w-4 h-4" /> EDITAR
                  </button>
              ) : (
                  <button onClick={() => setIsEditing(false)} className="p-3 bg-white/10 rounded-xl transition-all"><X size={20} /></button>
              )}
          </div>
          <div className="p-6 sm:p-12 space-y-10 flex-1 overflow-y-auto pb-32 sm:pb-12 bg-slate-900/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/60 p-6 rounded-[2rem] border border-slate-700/50 flex flex-col gap-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 bg-blue-600/5 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-5 relative z-10">
                      <div className={`p-4 rounded-2xl border ${location ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'} shadow-lg`}><MapPin size={24} /></div>
                      <div className="flex-1">
                         <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">COORDENADAS GPS</h4>
                         <p className="text-sm text-slate-200 font-mono font-bold mt-1 tracking-tight">{location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : "NÃO GEORREFERENCIADO"}</p>
                      </div>
                    </div>
                    {isEditing ? (
                        <button onClick={handleGetLocation} className="w-full py-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-95 shadow-xl hover:bg-blue-500">{gettingLocation ? "SINCRONIZANDO..." : "ATUALIZAR GPS"}</button>
                    ) : location && (
                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`, '_blank')} className="py-4 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-500 transition-all"><Navigation size={14} /> ROTA</button>
                            <button onClick={() => window.open(`https://earth.google.com/web/search/${location.lat},${location.lng}`, '_blank')} className="py-4 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-slate-700 transition-all border border-slate-700"><Globe size={14} /> EARTH</button>
                        </div>
                    )}
                </div>
                <div className="bg-slate-800/60 p-6 rounded-[2rem] border border-slate-700/50 flex items-center gap-5 shadow-xl">
                    <div className="p-4 bg-slate-700/50 text-slate-400 rounded-2xl border border-slate-600/30 shadow-lg"><Clock size={24} /></div>
                    <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">DATA DE CADASTRO</h4>
                        <p className="text-sm text-white font-black uppercase mt-1 tracking-tight">{item.createdAt ? item.createdAt.toDate().toLocaleDateString('pt-BR') : "---"}</p>
                    </div>
                </div>
              </div>

              {location && !isEditing && <MiniMapPreview lat={location.lat} lng={location.lng} tag={editData["Tag"]} height="h-48" />}

              <div className="space-y-6">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                    <Database size={12} className="text-blue-500" /> DADOS TÉCNICOS DO ATIVO
                 </h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(editData).map(([key, value]) => (
                        <div key={key} className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/40 hover:border-slate-600 transition-all shadow-lg group">
                          <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">{key}</h5>
                          {isEditing ? (
                            <input type="text" value={String(value)} onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none font-bold focus:border-blue-500 transition-all uppercase" />
                          ) : (
                            <p className="text-white font-black text-sm uppercase tracking-tight break-all">{String(value)}</p>
                          )}
                        </div>
                    ))}
                 </div>
              </div>
              
              <div className="pt-10 flex flex-col sm:flex-row gap-4">
                  {isEditing ? (
                    <>
                        <button onClick={() => { if(confirm("EXCLUIR REGISTRO PERMANENTEMENTE?")) onDelete(item.id) }} className="flex-1 py-5 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 font-black uppercase tracking-widest text-[10px] flex justify-center items-center gap-3 hover:bg-red-600/20 transition-all">
                            <Trash2 size={18} /> EXCLUIR REGISTRO
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className={`flex-[2] py-5 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] ${config.color} shadow-2xl flex justify-center items-center gap-3 transition-all active:scale-95 hover:brightness-110`}>
                            {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} SALVAR ALTERAÇÕES
                        </button>
                    </>
                  ) : (
                    <button onClick={() => { if(confirm("EXCLUIR REGISTRO PERMANENTEMENTE?")) onDelete(item.id) }} className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 font-black uppercase tracking-widest text-[10px] flex justify-center items-center gap-3 hover:bg-red-600/20 transition-all">
                        <Trash2 size={18} /> REMOVER DO SISTEMA
                    </button>
                  )}
              </div>
          </div>
      </div>
  );
};

/* Main Dashboard component managing overall navigation and satellite map access */
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
    <div className="min-h-screen bg-slate-900 p-5 sm:p-10">
        <div className="max-w-6xl mx-auto">
            <GroupPage groupKey={currentView} user={user} onBack={() => { setCurrentView('home'); setItemFromSearch(null); }} initialSelectedItem={itemFromSearch} />
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 p-6 sm:p-14 text-white relative flex flex-col">
      <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>
      
      {isMapModalOpen && <GlobalMapModal items={allData} onClose={() => setIsMapModalOpen(false)} onSelectItem={(item) => { setItemFromSearch(item); setCurrentView(item.groupType as GroupType); }} />}
      
      <div className="max-w-6xl mx-auto w-full space-y-8 animate-fadeIn relative z-10 flex-1">
        <header className="flex flex-col gap-6 sm:gap-10">
          <div className="flex justify-between items-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[8px] font-black uppercase tracking-[0.3em] text-blue-400 shadow-xl">
               TAGFINDER V6.0 <Activity className="w-3 h-3 animate-pulse" />
            </div>
            <button onClick={() => signOut(auth)} className="p-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-slate-500 hover:text-red-500 transition-all active:scale-90 shadow-xl"><LogOut size={20} /></button>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-10">
            <div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase leading-tight">Olá, <br/><span className="text-blue-500">{user.email?.split('@')[0]}</span></h1>
              <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-4 opacity-70 italic border-l-2 border-blue-500 pl-3">Monitoramento e Gestão Industrial</p>
            </div>
            
            <button onClick={handleOpenGlobalMap} disabled={loadingMap} className="group bg-slate-800/80 p-4 sm:p-6 rounded-[2rem] border border-slate-700 shadow-xl hover:border-blue-500/40 transition-all active:scale-[0.98] text-left relative overflow-hidden flex items-center gap-4 sm:gap-6">
               <div className="absolute top-0 right-0 p-16 bg-blue-600/10 rounded-full blur-[60px] -mr-8 -mt-8"></div>
               <div className="p-3 sm:p-4 bg-blue-500/10 text-blue-400 rounded-xl sm:rounded-2xl group-hover:scale-110 transition-all shadow-lg relative z-10 ring-2 sm:ring-4 ring-white/5">
                  {loadingMap ? <Loader2 className="animate-spin" size={24}/> : <Globe size={24} />}
               </div>
               <div className="relative z-10">
                  <h3 className="text-lg sm:text-xl font-black uppercase text-white leading-none tracking-tight">Painel Satélite</h3>
                  <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase mt-1.5 tracking-[0.2em]">Visão Híbrida Profissional</p>
               </div>
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8 pb-16">
            {Object.entries(groupsConfig).map(([key, group]) => (
            <button key={key} onClick={() => setCurrentView(key as GroupType)} className="relative overflow-hidden group bg-slate-900/60 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-800/80 flex flex-col items-start transition-all hover:bg-slate-800 hover:border-white/10 active:scale-95 shadow-lg sm:shadow-[0_20px_40px_rgba(0,0,0,0.3)]">
                <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-2xl ${group.lightColor} ${group.textColor} flex items-center justify-center mb-4 sm:mb-8 border border-white/5 transition-all group-hover:scale-110 shadow-xl ring-2 sm:ring-4 ring-white/5`}>
                  <group.icon className="w-5 h-5 sm:w-8 sm:h-8" />
                </div>
                <h2 className="text-xs sm:text-xl font-black tracking-tighter uppercase leading-none mb-2 sm:mb-4">{group.label}</h2>
                <div className={`inline-flex items-center gap-1.5 sm:gap-3 text-[7px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] ${group.textColor} opacity-60 group-hover:opacity-100 transition-opacity`}>
                  EXPLORAR <ArrowRight className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
                </div>
            </button>
            ))}
        </section>
      </div>

      <footer className="py-12 text-center border-t border-white/5 mt-auto">
        <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] opacity-40">TagFinder Enterprise Infrastructure &copy; 2024</p>
      </footer>
    </div>
  );
};

/* Separated GroupPage component handling asset listing and management for a specific category */
const GroupPage: React.FC<{ groupKey: GroupType; user: User; onBack: () => void; initialSelectedItem?: GroupItem | null }> = ({ groupKey, user, onBack, initialSelectedItem }) => {
  const config = groupsConfig[groupKey];
  const [items, setItems] = useState<GroupItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GroupItem | null>(initialSelectedItem || null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '', obs: '' });
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
      if (groupKey === 'painel') {
          data = { 
            ...data, 
            "IP": formData.ip,
            "Switch1": formData.switch1, 
            "Switch2": formData.switch2, 
            "Switch3": formData.switch3, 
            "Equipamento": finalEquip,
            "Observação": formData.obs
          };
      } else {
          data = { ...data, "IP": formData.ip };
      }
      
      data = removeEmptyKeys(data);
      if (location && showGPSInput) {
        data["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
        data["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      }
      
      await addDoc(collection(db, groupKey), { content: `Item: ${finalTag}`, data, userId: user.uid, userEmail: user.email, createdAt: serverTimestamp() });
      setIsModalOpen(false);
      setFormData({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '', obs: '' });
      setLocation(null);
    } catch (e) { alert('Erro'); } finally { setLoading(false); }
  };

  const filteredItems = items.filter(i => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return true;
    const tag = cleanTagName(i.data?.["Tag"] || i.content).toLowerCase();
    return tag.includes(s) || Object.values(i.data || {}).some(val => String(val).toLowerCase().includes(s));
  });

  if (selectedItem) return <ItemDetail item={selectedItem} groupKey={groupKey} config={config} user={user} onClose={() => setSelectedItem(null)} onDelete={(id) => deleteDoc(doc(db, groupKey, id)).then(() => setSelectedItem(null))} />;

  return (
    <div className="pb-24 animate-fadeIn">
      <div className="p-6 sm:p-10 mb-8 bg-slate-800/60 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-700 flex flex-col gap-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-5">
            <button onClick={onBack} className="p-3.5 bg-slate-700 rounded-2xl text-slate-300 transition-all shadow-lg active:scale-90"><ArrowLeft size={24} /></button>
            <div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase leading-none">{config.label}</h2>
              <span className="text-[9px] uppercase font-black text-slate-500 mt-2 block tracking-widest opacity-80">Gestão Operacional</span>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className={`hidden lg:flex px-6 py-3 rounded-xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] tracking-widest items-center gap-2 shadow-lg active:scale-95`}>
            <Plus size={18} /> Novo Registro
          </button>
        </div>
      </div>

      {/* SISTEMA DE BUSCA MELHORADO */}
      <div className="flex flex-col gap-5 mb-8 max-w-4xl mx-auto">
        <div className="relative group">
          <div className={`absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none transition-colors ${searchTerm ? 'text-blue-500' : 'text-slate-500'}`}>
            <Search className="h-5 w-5" />
          </div>
          <input 
            type="text" 
            placeholder={`Filtrar por tag, local ou IP...`} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-14 pr-14 py-5 bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-3xl text-white outline-none font-bold placeholder-slate-600 shadow-2xl focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
          {searchTerm && (
            <button 
                onClick={() => setSearchTerm('')} 
                className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-500 hover:text-white transition-colors"
            >
                <div className="bg-slate-700/50 p-1.5 rounded-lg hover:bg-slate-700">
                    <X className="h-4 w-4" />
                </div>
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                    {filteredItems.length} {filteredItems.length === 1 ? 'Resultado' : 'Resultados'}
                </span>
            </div>
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredItems.map(item => <ItemCard key={item.id} item={item} config={config} onSelect={() => setSelectedItem(item)} searchHighlight={searchTerm} />)}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center animate-fadeIn">
            <div className="p-8 bg-slate-800/40 rounded-full border border-slate-700 mb-6 group transition-all hover:scale-110">
                <FilterX className="w-16 h-16 text-slate-600 group-hover:text-blue-500 transition-colors" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Nenhum registro encontrado</h3>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed font-medium">Não encontramos ativos para "<span className="text-slate-300 font-bold">{searchTerm}</span>".</p>
        </div>
      )}

      <button onClick={() => setIsModalOpen(true)} className={`fixed bottom-8 right-8 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl z-50 bg-gradient-to-r ${config.gradient} transition-all border-2 border-white/10 active:scale-90`}><Plus size={32} /></button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
          <div className="bg-slate-800 w-full h-[90vh] sm:h-auto sm:max-w-lg sm:rounded-[2.5rem] border-t sm:border border-slate-600 overflow-y-auto shadow-2xl">
            <div className={`p-6 sm:p-8 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10 shadow-xl`}>
              <h3 className="text-lg font-black uppercase tracking-tight">Novo Ativo</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/10 rounded-xl transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
              <div className="space-y-6">
                  {groupKey === 'painel' ? (
                     <>
                       <div className="space-y-3">
                          <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest flex items-center gap-2"><MapPin className="w-3 h-3" /> 1. Sincronização Geográfica</label>
                          <button type="button" onClick={() => { setGettingLocation(true); navigator.geolocation.getCurrentPosition(p => { setLocation({lat: p.coords.latitude, lng: p.coords.longitude}); setGettingLocation(false); }, () => setGettingLocation(false), {enableHighAccuracy: true}) }} className="w-full py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-[9px] font-black uppercase text-blue-400 flex items-center justify-center gap-3 active:scale-95 transition-all">
                            {gettingLocation ? <Loader2 className="animate-spin w-4 h-4"/> : location ? <CheckCircle className="text-emerald-500 w-4 h-4"/> : <Crosshair className="w-4 h-4"/>}
                            {location ? "LOCALIZAÇÃO CAPTURADA" : "ATIVAR LOCALIZAÇÃO (GPS)"}
                          </button>
                          {location && <MiniMapPreview lat={location.lat} lng={location.lng} tag={formData.tag} height="h-32" />}
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">2. Tag do Painel</label>
                          <input type="text" placeholder="Ex: vc-1080ks-13.06" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-base font-black outline-none focus:border-blue-500 transition-all shadow-inner" />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest flex items-center gap-2"><Server className="w-3 h-3" /> Portas de Switch</label>
                          <div className="grid grid-cols-1 gap-2">
                             <input type="text" placeholder="Porta Switch 01" value={formData.switch1} onChange={e => setFormData({...formData, switch1: e.target.value})} className="w-full px-5 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-xs font-mono outline-none focus:border-blue-500" />
                             <input type="text" placeholder="Porta Switch 02" value={formData.switch2} onChange={e => setFormData({...formData, switch2: e.target.value})} className="w-full px-5 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-xs font-mono outline-none focus:border-blue-500" />
                             <input type="text" placeholder="Porta Switch 03" value={formData.switch3} onChange={e => setFormData({...formData, switch3: e.target.value})} className="w-full px-5 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-xs font-mono outline-none focus:border-blue-500" />
                          </div>
                       </div>
                       <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">6. Local Selecionável</label>
                         <select value={formData.local} onChange={e => setFormData({...formData, local: e.target.value, equipamento: ''})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-black uppercase outline-none focus:border-blue-500 appearance-none cursor-pointer">
                            <option value="">Selecione Local...</option>
                            {Object.keys(SYSTEM_DATA).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            <option value="NOVO">+ NOVO LOCAL OPERACIONAL</option>
                         </select>
                         {formData.local === "NOVO" && <input type="text" placeholder="Nome do Novo Local" value={formData.customLocal} onChange={e => setFormData({...formData, customLocal: e.target.value})} className="w-full px-5 py-4 mt-2 bg-slate-900 border border-blue-500/30 rounded-2xl text-white text-xs font-black uppercase" />}
                       </div>
                       <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">7. Equipamento</label>
                         <select disabled={!formData.local} value={formData.equipamento} onChange={e => setFormData({...formData, equipamento: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-black uppercase outline-none focus:border-blue-500 disabled:opacity-30 appearance-none cursor-pointer">
                            <option value="">Selecione Ativo...</option>
                            {formData.local && formData.local !== "NOVO" && SYSTEM_DATA[formData.local]?.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                            <option value="NOVO">+ NOVO ATIVO PERSONALIZADO</option>
                         </select>
                         {formData.equipamento === "NOVO" && <input type="text" placeholder="Nome do Novo Ativo" value={formData.customEquipamento} onChange={e => setFormData({...formData, customEquipamento: e.target.value})} className="w-full px-5 py-4 mt-2 bg-slate-900 border border-blue-500/30 rounded-2xl text-white text-xs font-black uppercase" />}
                       </div>
                       <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest flex items-center gap-2"><MessageSquare className="w-3 h-3" /> 8. Observações (OBS)</label>
                         <textarea placeholder="Observações adicionais..." value={formData.obs} onChange={e => setFormData({...formData, obs: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-bold outline-none focus:border-blue-500 min-h-[100px] resize-none" />
                       </div>
                     </>
                  ) : (
                     <>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Tag de Identificação</label>
                            <input type="text" placeholder="Ex: tr-1080ks-81" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-base font-black outline-none focus:border-blue-500 transition-all shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Endereço IP / Identificador</label>
                            <input type="text" placeholder="Ex: 10.x.x.x" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-mono outline-none focus:border-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Localização Técnica</label>
                            <input type="text" placeholder="Ex: Prédio Administrativo" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-black uppercase outline-none" />
                        </div>
                     </>
                  )}
              </div>
              <button type="submit" disabled={loading} className={`w-full py-5 rounded-[1.5rem] text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 disabled:opacity-50 mt-4`}>
                 {loading ? <Loader2 className="animate-spin" size={20}/> : "FINALIZAR CADASTRO"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;