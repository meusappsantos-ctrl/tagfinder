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
import { LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, MapPin, Loader2, Navigation, Edit, X, Globe, Trash2, Crosshair, Server, CheckCircle, Database, Clock, Navigation2, Locate, Activity, MapPinOff, FileDown, ZoomIn, ZoomOut } from 'lucide-react';

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
  "SISTEMA 1": ["TR-1081KS-03 (BC)", "TR-1082KS-13 (BCC)", "BELTI EE-1080KS-04 (MBW)", "BM-1080KS-04", "SE-1081KS-17", "SE-1081KS-03", "SE-1081KS-74", "SE-1081KS-13", "SE-1082KS-95 -(DRIVE)"],
  "SISTEMA 2": ["TR-1081KS-04", "TR-1081KS-52", "TR-1081KS-14 (bsm)", "TR-1081KS-05 (bsm)", "SE-1081KS-52", "SE-1081KS-04", "SE-1081KS-76", "BELTI EE-1080KS-02", "BM-1081KS-02", "SE-1081KS-50", "SE-1081KS-51", "SE-1081KS-56", "SE-1081KS-27", "SE-1081KS-97", "SE-1081KS-14", "SE-1081KS-18 (bsm)", "SE-1080KS-51 (bsm)"],
  "SISTEMA 3": ["TR-1081KS-11", "TR-1081KS-01", "BM-1081KS-03", "BELTI EE-1081KS03 (MBW)", "SE-1081KS-01", "SE-1081KS-70", "SE-1081KS-15", "SE-1081KS-21", "SE-1081KS-11", "SE-1081KS-91"],
  "SISTEMA 4": ["TR-1081KS-02", "TR-1081KS-12", "BM-1081KS-01", "BELTI EE-1081KS-01", "SE-1081KS-02", "SE-1081KS-72", "SE-1081KS-12", "SE-1081KS-23", "SE-1081KS-93"],
  "5ª BRITAGEM": ["BM-1080KS-13", "BM-1080KS-12", "BM-1080KS-11", "TR-1080KS-81", "TR-1085KS-36", "TR-1080KS-83", "TR-1080KS-88", "TR-1080KS-87", "TR-1080KS-82", "TR-1080KS-85", "TR-1080KS-86", "TR-1080KS-80", "TR-1080KS-84"],
  "CASA DE TRANSFERENCIA": ["TR-1082KS-01", "TR-1082KS-02", "TR-1082KS-03", "TR-1082KS-04", "TR-1082KS-05", "TR-1082KS-06", "TR-1080KS-37", "TR-1085KS-01", "TR-1085KS-04", "TR-1083KS-01", "TR-1084KS-01", "TR-1085KS-05", "SE-1084KS-01", "SE-1083KS-01", "SE-1082KS-02", "SE-1082KS-01", "SE-1085KS-23", "SE-1082KS-03", "SE-1082KS-04", "SE-6021KS-01", "SE-1085KS-22"],
  "OVERLAND": ["TR-1083KS-03", "TR-1083KS-04", "SE-1084KS-22", "SE-1084KS-21", "TR-1084KS-02", "TR-1083KS-02", "EE-1084KS-01 (mts)", "EE-1083KS-01 (mts)", "SE-1083KS-02", "SE-1084KS-02"]
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

const isKeyVisible = (k: string) => {
  if (!k) return false;
  const key = k.toUpperCase();
  return !key.includes('__EMPTY') && !key.includes('GEOLOCALIZAÇÃO') && !key.includes('LINK MAPS') && k.trim() !== "";
};

const MiniMapPreview: React.FC<{ lat: number, lng: number, tag: string, height?: string, className?: string }> = ({ lat, lng, tag, height = "h-32 sm:h-64", className = "" }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    
    if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
    }

    try {
      const map = L.map(mapRef.current, { 
        zoomControl: false, 
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false
      }).setView([lat, lng], 18);
      
      L.tileLayer(GOOGLE_HYBRID_URL, { 
        attribution: SATELLITE_ATTRIBUTION,
        maxZoom: 21,
        maxNativeZoom: 19
      }).addTo(map);

      L.circleMarker([lat, lng], {
        radius: 6, fillColor: '#3b82f6', color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1
      }).addTo(map);

      mapInstance.current = map;
      setTimeout(() => {
        if (mapInstance.current) mapInstance.current.invalidateSize();
      }, 300);
    } catch (e) { console.error("MiniMap error:", e); }

    return () => { 
        if (mapInstance.current) { 
            mapInstance.current.remove(); 
            mapInstance.current = null; 
        } 
    };
  }, [lat, lng, tag]);

  return <div ref={mapRef} className={`w-full ${height} rounded-xl border border-slate-700 overflow-hidden mt-2 shadow-inner ${className}`} />;
};

const GlobalMapModal: React.FC<{ items: GroupItem[], onClose: () => void, onSelectItem: (item: GroupItem) => void }> = ({ items, onClose, onSelectItem }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const assetsLayerRef = useRef<any>(null); // Camada exclusiva para os ativos
  const userLayerRef = useRef<any>(null);   // Camada exclusiva para o usuário
  const initialFitDone = useRef(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(newPos);
        setAccuracy(pos.coords.accuracy);
      },
      (err) => console.log("GPS erro:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Inicialização do Mapa (Apenas uma vez)
  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;

    try {
      const map = L.map(mapRef.current, {
        zoomControl: false,
        tap: true,
        scrollWheelZoom: true,
        touchZoom: true,
        dragging: true,
        doubleClickZoom: true,
        zoomAnimation: true
      }).setView([-15.7801, -47.9292], 4);
      
      L.tileLayer(GOOGLE_HYBRID_URL, { 
        attribution: SATELLITE_ATTRIBUTION,
        maxZoom: 21,
        maxNativeZoom: 19
      }).addTo(map);

      assetsLayerRef.current = L.layerGroup().addTo(map);
      userLayerRef.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
      
      setTimeout(() => {
        if(mapInstance.current) mapInstance.current.invalidateSize();
      }, 300);
    } catch (e) { console.error("Map init error:", e); }

    return () => {
        if (mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
        }
    };
  }, []);

  // Atualização da Posição do Usuário (Sem afetar zoom)
  useEffect(() => {
    if (!mapInstance.current || !userLayerRef.current || !userPos) return;

    if (!userMarkerRef.current) {
        if (accuracy) {
            accuracyCircleRef.current = L.circle(userPos, { radius: accuracy, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }).addTo(userLayerRef.current);
        }
        userMarkerRef.current = L.circleMarker(userPos, {
            radius: 12, fillColor: '#3b82f6', color: '#ffffff', weight: 3, opacity: 1, fillOpacity: 0.8, className: 'user-marker-pulse'
        }).addTo(userLayerRef.current);
        userMarkerRef.current.bindTooltip("Você", { permanent: false, direction: 'top' });
    } else {
        userMarkerRef.current.setLatLng(userPos);
        if (accuracyCircleRef.current && accuracy) {
            accuracyCircleRef.current.setLatLng(userPos);
            accuracyCircleRef.current.setRadius(accuracy);
        }
    }
  }, [userPos, accuracy]);

  // Atualização de Marcadores de Ativos e Fit Inicial
  useEffect(() => {
    if (!mapInstance.current || !assetsLayerRef.current || items.length === 0) return;

    assetsLayerRef.current.clearLayers();
    const bounds = L.latLngBounds([]);
    let hasGeo = false;

    items.forEach(item => {
      const geo = item.data?.["Geolocalização"];
      if (geo && geo.trim() !== "") {
        const parts = geo.split(',').map((p: string) => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const [lat, lng] = parts;
          let color = '#3b82f6'; 
          if (item.groupType === 'telecom') color = '#6366f1';
          if (item.groupType === 'painel') color = '#f97316';
          if (item.groupType === 'embarcados') color = '#10b981';
          
          const marker = L.circleMarker([lat, lng], {
            radius: 10, fillColor: color, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1
          });
          
          const tagName = item.data?.["Tag"] || "Equipamento";
          marker.bindTooltip(tagName, { permanent: true, direction: 'top', className: 'tag-label', offset: [0, -8] });
          
          const popupContent = document.createElement('div');
          popupContent.className = "p-2 min-w-[130px] flex flex-col gap-2";
          popupContent.innerHTML = `
            <div class="border-b border-slate-200 pb-2 mb-1">
              <p class="text-[10px] font-black text-slate-800 uppercase tracking-tighter">${tagName}</p>
              <p class="text-[8px] font-bold text-slate-500 uppercase">${item.groupType}</p>
            </div>
            <button id="view-details-${item.id}" class="bg-blue-600 text-white px-3 py-2 rounded text-[9px] font-black cursor-pointer border-none uppercase">Ver Detalhes</button>
            <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" class="bg-slate-800 text-white px-3 py-2 rounded text-[9px] font-black text-center no-underline uppercase">Google Maps</a>
          `;

          marker.bindPopup(popupContent);
          marker.on('popupopen', () => {
             const btn = document.getElementById(`view-details-${item.id}`);
             if (btn) btn.onclick = () => { onSelectItem(item); onClose(); };
          });

          assetsLayerRef.current.addLayer(marker);
          bounds.extend([lat, lng]);
          hasGeo = true;
        }
      }
    });

    // SÓ FAZ O FITBOUNDS UMA VEZ NA VIDA DO MODAL
    if (hasGeo && !initialFitDone.current) {
        if (userPos) bounds.extend(userPos);
        mapInstance.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 18 });
        initialFitDone.current = true;
    }
  }, [items]); // Depende apenas dos itens, não do GPS, para evitar instabilidade

  const handleZoomIn = (e: React.MouseEvent) => {
      e.stopPropagation();
      mapInstance.current?.zoomIn();
  };
  
  const handleZoomOut = (e: React.MouseEvent) => {
      e.stopPropagation();
      mapInstance.current?.zoomOut();
  };
  
  const handleRecenter = (e: React.MouseEvent) => {
      e.stopPropagation();
      if(userPos && mapInstance.current) {
          mapInstance.current.setView(userPos, 19, {animate: true});
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-800 w-full h-[100vh] sm:h-[85vh] sm:max-w-6xl sm:rounded-[2.5rem] overflow-hidden flex flex-col border border-slate-700 shadow-2xl relative">
        <div className="p-4 sm:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 backdrop-blur-md z-20 relative">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl"><Globe className="w-5 h-5" /></div>
             <h3 className="font-black text-white text-sm sm:text-base tracking-tighter uppercase">Painel Satélite</h3>
          </div>
          <div className="flex gap-2.5">
             <button onClick={onClose} className="p-2.5 bg-slate-700 rounded-xl text-slate-400 active:scale-90 transition-all"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
          </div>
        </div>
        <div className="flex-1 relative bg-slate-900 z-10">
            <div ref={mapRef} className="absolute inset-0 z-0 bg-slate-950" />
            
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 pointer-events-auto">
                <button onClick={handleZoomIn} className="p-3 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-xl text-white shadow-xl hover:bg-slate-700 active:scale-90"><ZoomIn size={20} /></button>
                <button onClick={handleZoomOut} className="p-3 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-xl text-white shadow-xl hover:bg-slate-700 active:scale-90"><ZoomOut size={20} /></button>
                <button onClick={handleRecenter} className="p-3 bg-blue-600 border border-white/20 rounded-xl text-white shadow-xl hover:bg-blue-500 active:scale-90"><Locate size={20} /></button>
            </div>

            <div className="absolute bottom-6 left-4 right-4 sm:left-6 sm:right-auto z-20 pointer-events-none">
                <div className="p-3 sm:p-4 bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl inline-flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${userPos ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest">{userPos ? 'GPS Sincronizado' : 'Buscando Satélites...'}</span>
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
  const [editData, setEditData] = useState<Record<string, any>>(item.data || {});
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(() => {
     if (item.data?.["Geolocalização"] && item.data["Geolocalização"].trim() !== "") {
         const parts = item.data["Geolocalização"].split(',');
         if (parts.length === 2) return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
     }
     return null;
  });
  const [gettingLocation, setGettingLocation] = useState(false);

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

  const downloadItemKML = () => {
    if (!location) return;
    const tagName = editData["Tag"] || "Tag_Sem_Nome";
    const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Placemark><name>${tagName}</name><Point><coordinates>${location.lng},${location.lat},0</coordinates></Point></Placemark></kml>`;
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${tagName}.kml`;
    link.click();
  };

  return (
      <div className="bg-slate-900 min-h-screen sm:min-h-[600px] sm:rounded-[2.5rem] border-x sm:border border-slate-700 shadow-2xl overflow-hidden flex flex-col animate-slideUp">
          <div className={`p-4 sm:p-8 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-20`}>
              <div className="flex items-center gap-3 sm:gap-4">
                  <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"><ArrowLeft className="w-5 h-5" /></button>
                  <h2 className="text-base sm:text-xl font-black uppercase truncate max-w-[150px] sm:max-w-xs">{isEditing ? "Edição" : (editData["Tag"] || "Detalhes")}</h2>
              </div>
              <div className="flex gap-2">
                 {!isEditing && <button onClick={() => setIsEditing(true)} className="px-3 sm:px-4 py-2 bg-white/20 rounded-lg text-[10px] sm:text-xs font-black uppercase flex items-center gap-2 transition-all hover:bg-white/30"><Edit className="w-4 h-4" /> <span className="hidden sm:inline">Editar</span></button>}
                 <button onClick={() => confirm("Remover permanentemente?") && onDelete(item.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg"><Trash2 className="w-5 h-5" /></button>
              </div>
          </div>
          <div className="p-4 sm:p-10 space-y-6 sm:space-y-8 flex-1 overflow-y-auto pb-24 sm:pb-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-700 flex flex-col gap-4 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl border ${location ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}><MapPin className="w-6 h-6" /></div>
                      <div className="flex-1">
                         <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Coordenadas Atuais</h4>
                         <p className="text-xs sm:text-sm text-slate-200 font-mono font-black break-all">{location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : "Não registrado"}</p>
                      </div>
                      {isEditing && location && (
                        <button onClick={() => setLocation(null)} className="p-2 bg-red-500/10 text-red-400 rounded-lg"><MapPinOff className="w-5 h-5" /></button>
                      )}
                    </div>
                    {location && <MiniMapPreview lat={location.lat} lng={location.lng} tag={editData["Tag"]} height="h-48 sm:h-64" />}
                    <div className="grid grid-cols-2 gap-2">
                        {isEditing ? (
                            <button onClick={() => { setGettingLocation(true); navigator.geolocation.getCurrentPosition(p => { setLocation({lat:p.coords.latitude, lng:p.coords.longitude}); setGettingLocation(false); }, () => setGettingLocation(false), {enableHighAccuracy:true}) }} className="col-span-2 py-4 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl active:scale-95 transition-all">{gettingLocation ? "Obtendo GPS..." : "Capturar Localização"}</button>
                        ) : location && (
                            <>
                                <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`, '_blank')} className="py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"><Navigation2 className="w-3 h-3" /> Rota</button>
                                <button onClick={downloadItemKML} className="py-3 bg-slate-700 text-white text-[10px] font-black uppercase rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"><FileDown className="w-3 h-3" /> KML</button>
                            </>
                        )}
                    </div>
                </div>
                <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-700 flex items-center gap-4 h-fit">
                    <div className="p-3 bg-slate-700/50 text-slate-400 rounded-xl"><Clock className="w-6 h-6" /></div>
                    <div><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Registrado em</h4><p className="text-sm text-slate-200 font-black">{item.createdAt ? item.createdAt.toDate().toLocaleDateString('pt-BR') : "---"}</p></div>
                </div>
              </div>
              <div className="space-y-4">
                 <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Ficha Técnica do Ativo</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(editData).filter(([k]) => isKeyVisible(k)).map(([key, value]) => (
                        <div key={key} className="bg-slate-800/50 p-4 sm:p-5 rounded-xl border border-slate-700/50">
                          <h5 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 truncate"><Database className="w-3 h-3 inline mr-1" /> {key}</h5>
                          {isEditing ? (
                            <input type="text" value={String(value)} onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none font-bold focus:border-blue-500 shadow-inner" />
                          ) : (
                            <p className="text-white font-black text-sm sm:text-base uppercase break-words">{String(value)}</p>
                          )}
                        </div>
                    ))}
                 </div>
              </div>
          </div>
          {isEditing && (
            <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-slate-900/95 backdrop-blur border-t border-slate-700 z-30 sm:relative sm:bg-transparent sm:border-none">
                <button onClick={handleSave} disabled={isSaving} className={`w-full py-4 sm:py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest ${config.color} shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all`}>
                    {isSaving ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>} Salvar Alterações
                </button>
            </div>
          )}
      </div>
  );
};

const ItemCard: React.FC<{ item: GroupItem; config: any; onSelect: () => void; onDelete: (e: React.MouseEvent, id: string) => void; onEdit: (e: React.MouseEvent, item: GroupItem) => void; searchHighlight: string; }> = ({ item, config, onSelect, onDelete, onEdit, searchHighlight }) => {
  const data = item.data || {};
  const tagValue = data["Tag"] || item.content.split('|')[0].trim().replace(/^Item:\s*/i, '');
  const localValue = data["Local"] || "Não definido";
  const hasGeo = !!data["Geolocalização"] && data["Geolocalização"].trim() !== "";

  return (
    <div onClick={onSelect} className="relative flex flex-col bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-1 shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer active:scale-95 group overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm sm:text-base font-black text-white truncate tracking-tighter uppercase"><HighlightedText text={tagValue} highlight={searchHighlight} /></h3>
          <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
             <button onClick={(e) => onEdit(e, item)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/30 active:scale-90"><Edit className="w-4 h-4" /></button>
             <button onClick={(e) => onDelete(e, item.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/30 active:scale-90"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 bg-slate-900/40 px-3 py-2 rounded-xl border border-white/5">
          <MapPin className={`w-3.5 h-3.5 ${hasGeo ? 'text-emerald-500' : 'text-slate-600'}`} />
          <span className="text-[10px] font-black truncate uppercase tracking-tight">{localValue}</span>
        </div>

        {config.id === 'painel' && (
          <div className="flex flex-col gap-1.5 mt-1 border-t border-white/5 pt-2">
            {['Switch1', 'Switch2', 'Switch3'].map((swKey, idx) => data[swKey] && (
              <div key={swKey} className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/50 border border-white/5 rounded-lg">
                <Server className="w-3 h-3 text-blue-400" />
                <span className="text-[8px] font-black text-slate-300 font-mono uppercase truncate">SW-0{idx+1}: {data[swKey]}</span>
              </div>
            ))}
          </div>
        )}

        {config.id === 'painel' && data["Equipamento"] && (
            <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg text-[8px] text-orange-400 font-black uppercase truncate tracking-widest">{data["Equipamento"]}</div>
        )}
        <div className="flex items-center justify-between text-[8px] font-black text-slate-500 pt-2 border-t border-white/5 uppercase tracking-widest">
           <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${hasGeo ? 'bg-emerald-500 animate-pulse shadow-[0_0_5px_#10b981]' : 'bg-slate-600'}`}></div>{config.label}</div>
           <span>{hasGeo ? 'LOCALIZADO' : 'S/ GPS'}</span>
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
      let data: any = { "Tag": formData.tag, "Local": finalLocal };
      if (groupKey === 'painel') {
          data = { ...data, "Switch1": formData.switch1, "Switch2": formData.switch2, "Switch3": formData.switch3, "Equipamento": finalEquip };
      } else {
          data = { ...data, "IP / Identificador": formData.ip };
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
    const s = searchTerm.toLowerCase();
    const dataValues = Object.values(i.data || {}).map(v => String(v).toLowerCase());
    return i.content.toLowerCase().includes(s) || dataValues.some(val => val.includes(s));
  });

  if (selectedItem) return <ItemDetail item={selectedItem} groupKey={groupKey} config={config} user={user} onClose={() => setSelectedItem(null)} onDelete={(id) => deleteDoc(doc(db, groupKey, id)).then(() => setSelectedItem(null))} />;

  return (
    <div className="pb-24 animate-fadeIn">
      <div className="p-6 sm:p-12 mb-6 sm:mb-8 bg-slate-800/60 rounded-3xl sm:rounded-[3rem] border border-slate-700 flex flex-col gap-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={onBack} className="p-3 sm:p-4 bg-slate-700 rounded-2xl text-slate-300 transition-all hover:bg-slate-600 active:scale-90"><ArrowLeft className="w-5 h-5 sm:w-7 sm:h-7" /></button>
            <div>
              <h2 className="text-2xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none">{config.label}</h2>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-black text-slate-500 mt-1 sm:mt-2 block">Central de Ativos Industriais</span>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className={`hidden sm:flex px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] sm:text-[11px] tracking-widest items-center gap-3 shadow-2xl hover:scale-105 active:scale-95 transition-all`}>
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Novo Registro
          </button>
        </div>
      </div>

      <div className="relative mb-8 sm:mb-10 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
        <input type="text" placeholder={`Buscar por tag, IP ou local...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 sm:pl-14 pr-6 py-4 sm:py-5 bg-slate-800/80 border border-slate-700 rounded-3xl text-white text-base sm:text-lg outline-none font-black placeholder-slate-600 shadow-2xl focus:border-blue-500 transition-all backdrop-blur-md" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {filteredItems.map(item => <ItemCard key={item.id} item={item} config={config} onSelect={() => setSelectedItem(item)} onDelete={(e, id) => { e.stopPropagation(); confirm("Remover?") && deleteDoc(doc(db, groupKey, id)) }} onEdit={(e, i) => { e.stopPropagation(); setSelectedItem(i); }} searchHighlight={searchTerm} />)}
      </div>

      <button onClick={() => setIsModalOpen(true)} className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl z-40 bg-gradient-to-r ${config.gradient} hover:scale-110 active:scale-90 transition-all border-2 border-white/20`}><Plus className="w-8 h-8 sm:w-10 sm:h-10" /></button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
          <div className="bg-slate-800 w-full h-[95vh] sm:h-auto sm:max-w-md sm:rounded-[3rem] border-t sm:border border-slate-600 overflow-y-auto">
            <div className={`p-6 sm:p-7 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10 shadow-xl`}>
              <h3 className="text-lg sm:text-xl font-black tracking-tighter uppercase leading-none">Novo Cadastro</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 sm:p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 sm:p-7 space-y-5 sm:space-y-6">
              <button type="button" onClick={() => { setGettingLocation(true); navigator.geolocation.getCurrentPosition(p => { setLocation({lat: p.coords.latitude, lng: p.coords.longitude}); setGettingLocation(false); }, () => setGettingLocation(false), {enableHighAccuracy: true}) }} className={`w-full py-4 sm:py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2 transition-all shadow-xl active:scale-95 ${location ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-blue-400 border border-slate-600'}`}>
                <div className="flex items-center gap-2">{gettingLocation ? <Loader2 className="animate-spin w-5 h-5"/> : location ? <CheckCircle className="w-5 h-5"/> : <Crosshair className="w-5 h-5"/>} {location ? "GPS LOCALIZADO" : "CAPTURAR GPS"}</div>
              </button>
              
              {location && <MiniMapPreview lat={location.lat} lng={location.lng} tag={formData.tag} />}

              <div className="space-y-4">
                <input type="text" placeholder="Tag do Ativo" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-base font-black uppercase focus:border-blue-500 outline-none transition-all" />
                
                {groupKey === 'painel' ? (
                   <>
                     <div className="grid grid-cols-1 gap-2">
                        {['switch1', 'switch2', 'switch3'].map((sw, i) => <input key={sw} type="text" placeholder={`Link Switch 0${i+1}`} value={formData[sw]} onChange={e => setFormData({...formData, [sw]: e.target.value})} className="w-full px-4 sm:px-5 py-3 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs sm:text-sm font-mono focus:border-blue-500 outline-none" />)}
                     </div>
                     <select value={formData.local} onChange={e => setFormData({...formData, local: e.target.value, equipamento: ''})} className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs sm:text-sm font-black uppercase focus:border-blue-500 outline-none appearance-none">
                        <option value="">Selecione o Local...</option>
                        {Object.keys(SYSTEM_DATA).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        <option value="NOVO">+ NOVO LOCAL</option>
                     </select>
                     {formData.local === "NOVO" && <input type="text" placeholder="Nome do Local" value={formData.customLocal} onChange={e => setFormData({...formData, customLocal: e.target.value})} className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-900 border border-blue-500/30 rounded-2xl text-white text-xs sm:text-sm font-black uppercase" />}
                     
                     <select disabled={!formData.local} value={formData.equipamento} onChange={e => setFormData({...formData, equipamento: e.target.value})} className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs sm:text-sm font-black uppercase focus:border-blue-500 outline-none disabled:opacity-30">
                        <option value="">Selecione o Ativo...</option>
                        {formData.local && SYSTEM_DATA[formData.local]?.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                        <option value="NOVO">+ NOVO ATIVO</option>
                     </select>
                     {formData.equipamento === "NOVO" && <input type="text" placeholder="Nome do Ativo" value={formData.customEquipamento} onChange={e => setFormData({...formData, customEquipamento: e.target.value})} className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-900 border border-blue-500/30 rounded-2xl text-white text-xs sm:text-sm font-black uppercase" />}
                   </>
                ) : (
                   <>
                     <input type="text" placeholder="Localização Técnica" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs sm:text-sm font-black uppercase focus:border-blue-500 outline-none" />
                     <input type="text" placeholder="Endereço IP / Identificador" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs sm:text-sm font-mono focus:border-blue-500 outline-none" />
                   </>
                )}
              </div>
              <button type="submit" disabled={loading} className={`w-full py-5 sm:py-6 rounded-3xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] sm:text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all disabled:opacity-50`}>
                 {loading ? <Loader2 className="animate-spin w-5 h-5 sm:w-6 sm:h-6"/> : "Concluir Cadastro"}
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

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-10 pb-24">
            {Object.entries(groupsConfig).map(([key, group]) => (
            <button key={key} onClick={() => setCurrentView(key as GroupType)} className="relative overflow-hidden group bg-slate-900/60 p-6 sm:p-14 rounded-[2rem] sm:rounded-[4rem] border border-slate-800/80 flex flex-col items-start transition-all hover:bg-slate-800 hover:border-white/10 active:scale-95 shadow-xl sm:shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
                <div className={`w-12 h-12 sm:w-24 sm:h-24 rounded-xl sm:rounded-[2rem] ${group.lightColor} ${group.textColor} flex items-center justify-center mb-4 sm:mb-12 border border-white/5 transition-all group-hover:scale-110 shadow-2xl ring-4 sm:ring-8 ring-white/5`}>
                  <group.icon className="w-6 h-6 sm:w-11 sm:h-11" />
                </div>
                <h2 className="text-sm sm:text-3xl font-black tracking-tighter uppercase leading-none mb-2 sm:mb-5">{group.label}</h2>
                <div className={`inline-flex items-center gap-2 sm:gap-4 text-[8px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] ${group.textColor} opacity-60 group-hover:opacity-100 transition-opacity`}>
                  EXPLORAR <ArrowRight className="w-3 h-3 sm:w-5 sm:h-5" />
                </div>
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