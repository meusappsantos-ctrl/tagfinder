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
import { LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, MapPin, Loader2, Navigation, Edit, X, Globe, Trash2, Map as MapIcon, Crosshair, Server, ImageIcon, CheckCircle, ChevronRight, Hash, Database, Clock, Navigation2, Share2, FileDown, Layers, Locate, Activity, ZoomIn, ZoomOut, MessageSquare, FilterX, IdCard, Link, FileText, Download } from 'lucide-react';

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

type GroupType = 'ctv' | 'telecom' | 'embarcados' | 'painel' | 'downloads';
type ViewState = 'home' | GroupType;

const GOOGLE_HYBRID_URL = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
const SATELLITE_ATTRIBUTION = '&copy; Google Maps';

const SYSTEM_DATA: Record<string, string[]> = {
  "SISTEMA 1": ["vc-1080ks-13.06", "bm-1080ks-04", "se-1081ks-03", "se-1081ks-13", "se-1081ks-17", "se-1081ks-74", "se-1082ks-95", "tr-1081ks-03", "tr-1082ks-13"],
  "SISTEMA 2": ["ee-1080ks-02", "bm-1081ks-02", "se-1080ks-51", "se-1081ks-14", "se-1081ks-18", "se-1081ks-27", "se-1081ks-50", "se-1081ks-51", "se-1081ks-52", "se-1081ks-56", "se-1081ks-76", "se-1081ks-97", "tr-1081ks-04", "tr-1081ks-05", "tr-1081ks-14", "tr-1081ks-52"],
  "SISTEMA 3": ["ee-1081ks-03", "bm-1081ks-03", "se-1081ks-01", "se-1081ks-11", "se-1081ks-15", "se-1081ks-21", "se-1081ks-70", "se-1081ks-91", "tr-1081ks-01", "tr-1081ks-11"],
  "SISTEMA 4": ["ee-1081ks-01", "bm-1081ks-01", "se-1081ks-02", "se-1081ks-12", "se-1081ks-23", "se-1081ks-72", "se-1081ks-93", "tr-1081ks-02", "tr-1081ks-12"],
  "5ª BRITAGEM": ["bm-1080ks-11", "bm-1080ks-12", "bm-1080ks-13", "tr-1080ks-80", "tr-1080ks-81", "tr-1080ks-82", "tr-1080ks-83", "tr-1080ks-84", "tr-1080ks-85", "tr-1080ks-86", "tr-1080ks-87", "tr-1080ks-88", "tr-1085ks-36"],
  "CASA DE TRANSFERENCIA": ["ee-1084ks-01", "se-1082ks-01", "se-1082ks-02", "se-1082ks-03", "se-1082ks-04", "se-1083ks-01", "se-1084ks-01", "se-1085ks-22", "se-1085ks-23", "se-6021ks-01", "tr-1080ks-37", "tr-1082ks-01", "tr-1082ks-02", "tr-1082ks-03", "tr-1082ks-04", "tr-1082ks-05", "tr-1082ks-06", "tr-1083ks-01", "tr-1084ks-01", "tr-1085ks-01", "tr-1085ks-04", "tr-1085ks-05"],
  "OVERLAND": ["ee-1083ks-01", "ee-1084ks-01", "se-1083ks-02", "se-1084ks-02", "se-1084ks-21", "se-1084ks-22", "tr-1083ks-02", "tr-1083ks-03", "tr-1083ks-04", "tr-1084ks-02"]
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
  downloads: { 
    id: 'downloads', label: 'Downloads', icon: FileDown, color: 'bg-cyan-600', textColor: 'text-cyan-400',
    lightColor: 'bg-cyan-900/30', borderColor: 'border-cyan-800/50', gradient: 'from-cyan-600 to-cyan-800'
  },
};

const normalizeText = (text: string) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const HighlightedText: React.FC<{ text: string; highlight: string; className?: string }> = ({ text, highlight, className = "" }) => {
  if (!highlight.trim()) return <span className={className}>{text}</span>;
  
  const terms = highlight.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  if (terms.length === 0) return <span className={className}>{text}</span>;

  const pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) => regex.test(part) ? (
        <mark key={i} className="bg-blue-500/40 text-white rounded px-0.5 font-bold shadow-sm inline-block">{part}</mark>
      ) : part)}
    </span>
  );
};

const getGoogleDriveDirectLink = (url: string) => {
    try {
        const idMatch = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
        }
        return url;
    } catch (e) {
        return url;
    }
};

const MiniMapPreview: React.FC<{ lat: number, lng: number, tag: string }> = ({ lat, lng, tag }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (typeof L === 'undefined') return;
    if (mapInstance.current) {
        mapInstance.current.setView([lat, lng], 18);
        return;
    }
    const map = L.map(mapRef.current, { 
      zoomControl: false, 
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      touchZoom: false
    }).setView([lat, lng], 18);
    
    L.tileLayer(GOOGLE_HYBRID_URL, { maxZoom: 22 }).addTo(map);
    
    const marker = L.circleMarker([lat, lng], {
      radius: 6, fillColor: '#3b82f6', color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1
    }).addTo(map);
    
    marker.bindTooltip(tag || "Ativo", { permanent: true, direction: 'top', className: 'tag-label' }).openTooltip();
    mapInstance.current = map;
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [lat, lng, tag]);

  return <div ref={mapRef} className="w-full h-40 rounded-2xl border border-slate-700 shadow-inner overflow-hidden mt-2" />;
};

const GlobalMapModal: React.FC<{ items: GroupItem[], onClose: () => void }> = ({ items, onClose }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const initialFitDone = useRef(false);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(newPos);
        if (userMarkerRef.current && mapInstance.current) {
            userMarkerRef.current.setLatLng(newPos);
        }
      },
      (err) => console.log("GPS erro ou negado", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || typeof L === 'undefined') return;
    try {
      const map = L.map(mapRef.current, { zoomControl: false, maxZoom: 22 }).setView([-15.7801, -47.9292], 4);
      L.tileLayer(GOOGLE_HYBRID_URL, { 
        maxZoom: 22,
        maxNativeZoom: 21,
        attribution: SATELLITE_ATTRIBUTION
      }).addTo(map);
      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
      
      setTimeout(() => map.invalidateSize(), 400);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current) return;
    
    layerGroupRef.current.clearLayers();
    const bounds = L.latLngBounds([]);
    let hasItemsWithGeo = false;

    if (userPos && !userMarkerRef.current) {
        userMarkerRef.current = L.circleMarker(userPos, {
            radius: 10, fillColor: '#3b82f6', color: '#ffffff', weight: 3, opacity: 1, fillOpacity: 1, className: 'user-marker-pulse'
        }).addTo(mapInstance.current);
        userMarkerRef.current.bindTooltip("Você", { permanent: false, direction: 'top' });
    } else if (userPos) {
        userMarkerRef.current.setLatLng(userPos);
    }

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
            radius: 8, fillColor: color, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1
          });
          const tagName = item.data?.["Tag"] || "Equipamento";
          marker.bindTooltip(tagName, { 
            permanent: true, 
            direction: 'top', 
            className: 'tag-label', 
            offset: [0, -8] 
          });
          
          const popupContent = `
            <div class="p-3 min-w-[150px] flex flex-col gap-2 bg-slate-900 text-white rounded-lg shadow-2xl border border-slate-700">
              <div class="border-b border-slate-700 pb-2">
                <p class="text-[10px] font-black uppercase tracking-tighter text-blue-400">${tagName}</p>
                <p class="text-[8px] font-bold text-slate-500 uppercase">${item.groupType || 'Ativo'}</p>
              </div>
              <div class="flex flex-col gap-1.5 mt-1">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" class="w-full bg-blue-600 hover:bg-blue-500 text-white px-2 py-2 rounded text-[9px] font-black text-center no-underline uppercase transition-colors">Abrir Rota</a>
                <a href="https://earth.google.com/web/search/${lat},${lng}" target="_blank" class="w-full bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-2 rounded text-[9px] font-black text-center no-underline uppercase transition-colors">Google Earth</a>
              </div>
            </div>
          `;
          marker.bindPopup(popupContent, { className: 'custom-popup' });
          layerGroupRef.current.addLayer(marker);
          bounds.extend([lat, lng]);
          hasItemsWithGeo = true;
        }
      }
    });

    if (hasItemsWithGeo && !initialFitDone.current) {
        if (userPos) bounds.extend(userPos);
        mapInstance.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 18 });
        initialFitDone.current = true;
    }
  }, [items, userPos]);

  const centerOnUser = () => {
    if (userPos && mapInstance.current) {
        mapInstance.current.setView(userPos, 19, { animate: true });
    }
  };

  const handleZoomIn = () => {
      if (mapInstance.current) {
          mapInstance.current.zoomIn();
      }
  };
  
  const handleZoomOut = () => {
      if (mapInstance.current) {
          mapInstance.current.zoomOut();
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 w-full h-[100vh] sm:h-[90vh] sm:max-w-6xl sm:rounded-[2.5rem] overflow-hidden flex flex-col border border-slate-800 shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur-xl relative z-20">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20"><Globe className="w-5 h-5" /></div>
             <div>
                <h3 className="font-black text-white text-base sm:text-lg tracking-tighter uppercase leading-none">Painel Satélite Profissional</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Google Earth Hybrid Imagery</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-xl text-slate-400 transition-all active:scale-90 border border-slate-700"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 relative bg-black">
            <div ref={mapRef} className="absolute inset-0 z-0" />
            
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
                <button onClick={handleZoomIn} className="p-3.5 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl text-white shadow-2xl active:scale-90 transition-all hover:bg-slate-800"><ZoomIn size={24} /></button>
                <button onClick={handleZoomOut} className="p-3.5 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl text-white shadow-2xl active:scale-90 transition-all hover:bg-slate-800"><ZoomOut size={24} /></button>
                <button onClick={centerOnUser} className="p-3.5 bg-blue-600 border border-blue-400/50 rounded-2xl text-white shadow-2xl active:scale-90 transition-all hover:bg-blue-500"><Locate size={24} /></button>
            </div>

            <div className="absolute bottom-6 left-6 z-10">
                <div className="px-4 py-3 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/5 flex items-center gap-3 shadow-2xl">
                    <div className={`w-2.5 h-2.5 rounded-full ${userPos ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{userPos ? 'GPS Ativo' : 'Buscando Sinal...'}</span>
                </div>
            </div>
            
            <style>{`
                .leaflet-popup-content-wrapper { background: transparent !important; padding: 0 !important; box-shadow: none !important; }
                .leaflet-popup-tip { background: #0f172a !important; }
                .custom-popup .leaflet-popup-content { margin: 0 !important; }
            `}</style>
        </div>
      </div>
    </div>
  );
};

const isKeyVisible = (k: string) => {
  if (!k) return false;
  const key = k.toLowerCase();
  return !key.includes('geo') && 
         !key.includes('link') && 
         !key.includes('empty') && 
         !k.startsWith('__') &&
         k.trim() !== "";
};

const ItemCard: React.FC<{ item: GroupItem; config: any; onSelect: () => void; onDelete: (e: React.MouseEvent, id: string) => void; onEdit: (e: React.MouseEvent, item: GroupItem) => void; searchHighlight: string; }> = ({ item, config, onSelect, onDelete, onEdit, searchHighlight }) => {
  const data = item.data || {};
  const isDownload = config.id === 'downloads';
  const tagValue = data["Tag"] || item.content.split('|')[0].trim().replace(/^Item:\s*/i, '');
  const localValue = data["Local"] || "S/ Local";
  const hasGeo = !!data["Geolocalização"];
  const isPainel = config.id === 'painel';
  const isTelecomOrEmbedded = config.id === 'telecom' || config.id === 'embarcados';

  if (isDownload) {
    const driveLink = data["Drive Link"] || "";
    const directLink = getGoogleDriveDirectLink(driveLink);

    return (
        <div className="relative flex flex-col bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow hover:shadow-xl transition-all group overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/20">
                    <FileText className="w-5 h-5" />
                </div>
                <div className="flex gap-1.5">
                    <button onClick={(e) => onEdit(e, item)} className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-blue-500/20 hover:text-blue-400 transition-all"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => onDelete(e, item.id)} className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>
            <h3 className="text-base font-black text-white truncate tracking-tighter uppercase mb-1">
                <HighlightedText text={tagValue} highlight={searchHighlight} />
            </h3>
            <p className="text-[10px] text-slate-400 line-clamp-2 mb-4 leading-relaxed h-8">
                <HighlightedText text={data["Descrição"] || "Sem descrição disponível."} highlight={searchHighlight} />
            </p>
            <div className="grid grid-cols-2 gap-2 mt-auto">
                <button onClick={() => window.open(driveLink, '_blank')} className="py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-[9px] font-black uppercase rounded-lg flex items-center justify-center gap-2 transition-all">
                    <Link className="w-3 h-3" /> Drive
                </button>
                <button onClick={() => window.open(directLink, '_blank')} className="py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[9px] font-black uppercase rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
                    <Download className="w-3 h-3" /> Download
                </button>
            </div>
        </div>
    );
  }

  return (
    <div onClick={onSelect} className="relative flex flex-col bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-1 shadow hover:shadow-xl transition-all cursor-pointer active:scale-95 group overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-black text-white truncate tracking-tighter uppercase group-hover:text-blue-400 transition-colors">
            <HighlightedText text={tagValue} highlight={searchHighlight} />
          </h3>
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={(e) => onEdit(e, item)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"><Edit className="w-3.5 h-3.5" /></button>
             <button onClick={(e) => onDelete(e, item.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-slate-400 bg-slate-900/30 px-2.5 py-1.5 rounded-lg border border-white/5">
          <MapPin className={`w-3.5 h-3.5 ${hasGeo ? 'text-emerald-500' : 'text-slate-600'}`} />
          <span className="text-[10px] font-bold truncate tracking-tight uppercase">
            <HighlightedText text={localValue} highlight={searchHighlight} />
          </span>
        </div>
        
        {isTelecomOrEmbedded && (data["IP / Equipamento"] || data["IP"]) && (
            <div className="px-2.5 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] text-blue-300 font-mono flex items-center gap-2">
                <Database className="w-3 h-3 text-blue-500" />
                <span className="truncate tracking-widest uppercase">
                    <HighlightedText text={data["IP / Equipamento"] || data["IP"]} highlight={searchHighlight} />
                </span>
            </div>
        )}

        {isPainel && (
            <div className="space-y-2">
                {data["Equipamento"] && (
                    <div className="px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded text-[9px] text-orange-400 font-black uppercase tracking-tighter truncate">
                        <HighlightedText text={data["Equipamento"]} highlight={searchHighlight} />
                    </div>
                )}
                <div className="flex flex-wrap gap-1">
                    {['Switch1', 'Switch2', 'Switch3'].map(sw => data[sw] && (
                        <div key={sw} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/30 rounded text-[7px] text-slate-300 font-bold border border-white/5">
                            <Activity className="w-2.5 h-2.5 text-blue-400" />
                            <span>{sw.replace('Switch', 'SW')}: <HighlightedText text={data[sw]} highlight={searchHighlight} /></span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="flex items-center justify-between text-[8px] font-black text-slate-500 pt-2 border-t border-white/5 uppercase tracking-widest">
           <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${hasGeo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>{config.label}</div>
           <span>{hasGeo ? 'GPS OK' : 'SEM GPS'}</span>
        </div>
      </div>
    </div>
  );
};

const GroupPage: React.FC<{ groupKey: GroupType; user: User; onBack: () => void; }> = ({ groupKey, user, onBack }) => {
  const config = groupsConfig[groupKey];
  const Icon = config.icon;
  const [items, setItems] = useState<GroupItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GroupItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ 
    tag: '', local: '', ip: '', 
    switch1: '', switch2: '', switch3: '', equipamento: '',
    customLocal: '', customEquipamento: '', obs: '',
    driveLink: '', description: ''
  });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const q = query(collection(db, groupKey), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as GroupItem[]));
  }, [groupKey]);

  const handleGetLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGettingLocation(false); },
      () => { setGettingLocation(false); alert('GPS Falhou'); },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data: any = {};
      
      if (groupKey === 'downloads') {
          data = {
              "Tag": formData.tag,
              "Drive Link": formData.driveLink,
              "Descrição": formData.description,
              "Tipo": "Arquivo Google Drive"
          };
      } else if (groupKey === 'painel') {
          const finalLocal = formData.local === "NOVO" ? formData.customLocal : formData.local;
          const finalEquip = formData.equipamento === "NOVO" ? formData.customEquipamento : formData.equipamento;
          data = { 
            "Tag": formData.tag, 
            "Switch1": formData.switch1, 
            "Switch2": formData.switch2, 
            "Switch3": formData.switch3, 
            "Local": finalLocal, 
            "Equipamento": finalEquip,
            "Observação": formData.obs
          };
      } else {
          const finalLocal = formData.local === "NOVO" ? formData.customLocal : formData.local;
          data = { "Tag": formData.tag, "Local": finalLocal, "IP / Equipamento": formData.ip };
      }

      if (location && groupKey !== 'downloads') {
        data["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
        data["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      }

      await addDoc(collection(db, groupKey), { 
          content: `Item: ${formData.tag}`, 
          data, 
          userId: user.uid, 
          userEmail: user.email, 
          createdAt: serverTimestamp() 
      });

      setIsModalOpen(false);
      setFormData({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '', obs: '', driveLink: '', description: '' });
      setLocation(null);
    } catch (e) { alert('Erro ao salvar'); } finally { setLoading(false); }
  };

  const quickDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Deseja excluir permanentemente?")) {
        deleteDoc(doc(db, groupKey, id));
    }
  };

  const quickEdit = (e: React.MouseEvent, item: GroupItem) => {
    e.stopPropagation();
    setSelectedItem(item);
  };

  const filteredItems = items.filter(item => {
    const s = normalizeText(searchTerm.trim());
    if (!s) return true;
    const terms = s.split(/\s+/);
    const searchableValues = [
        item.content,
        ...(item.data ? Object.values(item.data) : [])
    ].map(v => normalizeText(String(v))).join(" ");
    return terms.every(term => searchableValues.includes(term));
  });

  return (
    <div className="pb-24 sm:pb-12 animate-fadeIn">
      {selectedItem ? (
        <ItemDetail 
          item={selectedItem} 
          groupKey={groupKey} 
          config={config} 
          user={user} 
          onClose={() => setSelectedItem(null)} 
          onDelete={(id) => deleteDoc(doc(db, groupKey, id)).then(() => setSelectedItem(null))} 
        />
      ) : (
        <>
          <div className={`p-6 sm:p-10 mb-6 bg-slate-800/60 rounded-[2rem] sm:rounded-[3rem] border border-slate-700 flex flex-col gap-6 relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 p-20 ${config.lightColor} blur-3xl -mr-10 -mt-10 opacity-20`}></div>
            <div className="flex items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-3 bg-slate-700 rounded-xl text-slate-300 transition-all hover:bg-slate-600 active:scale-95"><ArrowLeft className="w-6 h-6" /></button>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                     <div className={`p-1 rounded bg-gradient-to-br ${config.gradient} text-white`}><Icon className="w-3 h-3" /></div>
                     <span className="text-[9px] uppercase tracking-widest font-black text-slate-500">{config.label}</span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter">{groupKey === 'downloads' ? "Arquivos & Drive" : "Gerenciar"}</h2>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(true)} className={`hidden sm:flex px-6 py-3 rounded-xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] tracking-widest items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all`}>
                <Plus className="w-4 h-4" /> {groupKey === 'downloads' ? "Novo Link" : "Adicionar"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-5 mb-8 max-w-4xl mx-auto">
            <div className="relative group">
              <div className={`absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none transition-colors ${searchTerm ? config.textColor : 'text-slate-500'}`}>
                <Search className="h-5 w-5" />
              </div>
              <input 
                type="text" 
                placeholder={`Pesquisar em ${config.label}...`} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-14 pr-14 py-5 bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-3xl text-white outline-none font-bold placeholder-slate-600 shadow-2xl focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-500 hover:text-white transition-colors">
                    <div className="bg-slate-700/50 p-1.5 rounded-lg hover:bg-slate-700"><X className="h-4 w-4" /></div>
                </button>
              )}
            </div>
            <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                    {filteredItems.length} {filteredItems.length === 1 ? 'Resultado' : 'Resultados'}
                </span>
            </div>
          </div>

          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => <ItemCard key={item.id} item={item} config={config} onSelect={() => setSelectedItem(item)} onDelete={quickDelete} onEdit={quickEdit} searchHighlight={searchTerm} />)}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center animate-fadeIn">
                <div className="p-8 bg-slate-800/40 rounded-full border border-slate-700 mb-6 group transition-all hover:scale-110">
                    <FilterX className="w-16 h-16 text-slate-600 group-hover:text-blue-500 transition-colors" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Nenhum registro encontrado</h3>
                <p className="text-slate-500 text-sm max-w-xs leading-relaxed font-medium">Não encontramos itens para "<span className="text-slate-300 font-bold">{searchTerm}</span>".</p>
                <button onClick={() => setSearchTerm('')} className="mt-8 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 text-[10px] font-black uppercase tracking-widest transition-all">Limpar Busca</button>
            </div>
          )}

          <button onClick={() => setIsModalOpen(true)} className={`fixed bottom-6 right-6 w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-2xl z-40 bg-gradient-to-r ${config.gradient} hover:scale-110 active:scale-90 transition-all cursor-pointer`}><Plus className="w-8 h-8" /></button>

          {isModalOpen && (
            <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md">
              <div className="bg-slate-800 w-full h-[95vh] sm:h-auto sm:max-w-md sm:rounded-[2.5rem] border-t sm:border border-slate-600 overflow-y-auto">
                <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10 shadow-xl`}>
                  <h3 className="text-xl font-black tracking-tighter uppercase">{groupKey === 'downloads' ? "Cadastrar Link Drive" : "Novo Registro"}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-5">
                  {groupKey !== 'downloads' && (
                    <button type="button" onClick={handleGetLocation} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 transition-all ${location ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-blue-400 border border-slate-600'}`}>
                      <div className="flex items-center gap-2">{gettingLocation ? <Loader2 className="animate-spin w-4 h-4"/> : location ? <CheckCircle className="text-emerald-500 w-4 h-4"/> : <Crosshair className="w-4 h-4"/>} {location ? "GPS ATIVO" : "ATIVAR LOCALIZAÇÃO"}</div>
                    </button>
                  )}
                  
                  {location && <MiniMapPreview lat={location.lat} lng={location.lng} tag={formData.tag} />}

                  <div className="space-y-4">
                    {groupKey === 'downloads' ? (
                        <>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-widest">Nome do Arquivo</label>
                                <input type="text" placeholder="Ex: Manual Rádio Motorola V2" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm outline-none font-bold uppercase focus:border-cyan-500 transition-colors" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-widest">Link do Google Drive</label>
                                <input type="url" placeholder="https://drive.google.com/..." required value={formData.driveLink} onChange={e => setFormData({...formData, driveLink: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm outline-none font-mono focus:border-cyan-500 transition-colors" />
                                <p className="text-[8px] text-slate-500 mt-1 font-bold">* Certifique-se de que o acesso está como "Qualquer pessoa com o link".</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-widest">Descrição / Versão</label>
                                <textarea placeholder="Detalhes técnicos do arquivo..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm outline-none font-bold focus:border-cyan-500 transition-colors min-h-[80px] resize-none" />
                            </div>
                        </>
                    ) : groupKey === 'painel' ? (
                        <>
                            <div className="space-y-1">
                               <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-widest">1. Tag do Painel</label>
                               <input type="text" placeholder="Ex: PNL-01" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm outline-none font-bold uppercase focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                               {['switch1', 'switch2', 'switch3'].map((sw, i) => (
                                 <div key={sw} className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-widest">{i + 2}. Switch {i+1}</label>
                                    <input type="text" placeholder={`Porta/Link`} value={formData[sw]} onChange={e => setFormData({...formData, [sw]: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm outline-none font-mono focus:border-blue-500 transition-colors" />
                                 </div>
                               ))}
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-widest">5. Local Selecionável</label>
                               <select value={formData.local} onChange={e => setFormData({...formData, local: e.target.value, equipamento: ''})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm outline-none font-bold focus:border-blue-500 transition-colors">
                                  <option value="">Selecione o Local...</option>
                                  {Object.keys(SYSTEM_DATA).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                  <option value="NOVO">+ ADICIONAR NOVO LOCAL</option>
                               </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-1">
                               <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-widest">Tag do Ativo</label>
                               <input type="text" placeholder="Ex: CTV-01" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm outline-none font-bold uppercase focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-widest">Localização</label>
                               <input type="text" placeholder="Ex: Sala Técnica" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm outline-none font-bold focus:border-blue-500 transition-colors uppercase" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-widest">IP / ID</label>
                               <input type="text" placeholder="Ex: 10.0.0.1" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm outline-none font-mono focus:border-blue-500 transition-colors" />
                            </div>
                        </>
                    )}
                  </div>
                  <button type="submit" disabled={loading} className={`w-full py-5 rounded-2xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase tracking-widest text-[10px] shadow-2xl flex justify-center items-center gap-3 mt-4 active:scale-95 transition-all`}>
                     {loading ? <Loader2 className="animate-spin w-5 h-5"/> : "Salvar Registro"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

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
      () => { setGettingLocation(false); alert('Falha GPS.'); },
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
                 {!isEditing && (
                     <>
                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white/20 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all hover:bg-white/30">
                            <Edit className="w-4 h-4" /> Editar
                        </button>
                        <button onClick={() => { if(confirm("Excluir este ativo permanentemente?")) onDelete(item.id) }} className="p-2 bg-red-500/20 text-red-400 rounded-lg transition-all hover:bg-red-500/40">
                            <Trash2 className="w-5 h-5" />
                        </button>
                     </>
                 )}
                 {isEditing && (
                    <div className="flex gap-2">
                        <button onClick={() => { if(confirm("Deseja excluir enquanto edita?")) onDelete(item.id) }} className="p-2 bg-red-500/20 text-red-400 rounded-lg transition-all hover:bg-red-500/40">
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => setIsEditing(false)} className="p-2 bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                 )}
              </div>
          </div>
          <div className="p-4 sm:p-8 lg:p-12 space-y-6 sm:space-y-10 flex-1 overflow-y-auto pb-24 sm:pb-8">
              {groupKey !== 'downloads' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col gap-4 shadow-xl">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl border ${location ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}><MapPin className="w-5 h-5" /></div>
                        <div className="flex-1">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coordenadas GPS</h4>
                           <p className="text-xs sm:text-sm text-slate-200 font-mono font-bold truncate">{location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : "Não registrado"}</p>
                        </div>
                      </div>
                      {isEditing && <button onClick={handleGetLocation} className="w-full py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95">{gettingLocation ? "Obtendo..." : "Atualizar GPS"}</button>}
                  </div>
                  <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex items-center gap-4 shadow-xl">
                      <div className="p-3 bg-slate-700/50 text-slate-400 rounded-xl border border-slate-600/30"><Clock className="w-5 h-5" /></div>
                      <div><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Cadastro</h4><p className="text-xs sm:text-sm text-slate-200 font-bold">{item.createdAt ? item.createdAt.toDate().toLocaleDateString('pt-BR') : "---"}</p></div>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ficha de Informações</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                    {Object.entries(editData).filter(([k]) => isKeyVisible(k)).map(([key, value]) => (
                        <div key={key} className="bg-slate-800/40 p-4 sm:p-6 rounded-xl border border-slate-700/50">
                          <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Database className="w-3 h-3 text-blue-400" /> {key}</h5>
                          {isEditing ? (
                            <input type="text" value={String(value)} onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none font-bold focus:border-blue-500 transition-colors" />
                          ) : (
                            <p className="text-white font-black text-sm sm:text-base break-all uppercase tracking-tight">{String(value)}</p>
                          )}
                        </div>
                    ))}
                 </div>
              </div>
              {isEditing && (
                <div className="grid grid-cols-2 gap-4 pt-6">
                    <button onClick={() => { if(confirm("Excluir registro?")) onDelete(item.id) }} className="py-5 rounded-2xl bg-red-600/20 text-red-400 font-black uppercase tracking-widest text-[10px] flex justify-center items-center gap-2 hover:bg-red-600/40 transition-all">
                        <Trash2 className="w-4 h-4" /> Excluir
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className={`py-5 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] ${config.color} shadow-2xl flex justify-center items-center gap-3 transition-all active:scale-95`}>
                        {isSaving ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>} Salvar Alterações
                    </button>
                </div>
              )}
          </div>
      </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [allMapItems, setAllMapItems] = useState<GroupItem[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);

  const handleOpenGlobalMap = async () => {
    setLoadingMap(true);
    try {
      const colls = ['ctv', 'telecom', 'painel', 'embarcados'];
      const results = await Promise.all(colls.map(c => getDocs(collection(db, c))));
      const items = results.flatMap((snap, idx) => snap.docs.map(d => ({ id: d.id, ...d.data(), groupType: colls[idx] as GroupType })));
      setAllMapItems(items);
      setIsMapModalOpen(true);
    } catch (e) { console.error(e); } finally { setLoadingMap(false); }
  };

  if (currentView !== 'home') return <div className="min-h-screen bg-slate-900 p-4 sm:p-12"><div className="max-w-7xl mx-auto"><GroupPage groupKey={currentView} user={user} onBack={() => setCurrentView('home')} /></div></div>;

  return (
    <div className="min-h-screen bg-slate-900 p-5 sm:p-12 text-white relative overflow-hidden flex flex-col">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      
      {isMapModalOpen && <GlobalMapModal items={allMapItems} onClose={() => setIsMapModalOpen(false)} />}
      
      <div className="max-w-6xl mx-auto w-full space-y-10 animate-fadeIn relative z-10 flex-1">
        <header className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[8px] font-black uppercase tracking-widest text-blue-400">
              <IdCard className="w-3 h-3 text-blue-400" /> TagFinder Cloud
            </div>
            <button onClick={() => signOut(auth)} className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-500 active:scale-90 transition-all hover:bg-slate-700/50"><LogOut className="w-5 h-5" /></button>
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter leading-tight">
              Olá, <span className="text-blue-400">{user.displayName || user.email?.split('@')[0]}</span>
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-medium">Gestão integrada e monitoramento em tempo real.</p>
          </div>

          <button 
            onClick={handleOpenGlobalMap} 
            disabled={loadingMap} 
            className="group relative overflow-hidden w-full p-8 sm:p-10 rounded-[2.5rem] bg-slate-800/60 border border-slate-700 shadow-2xl transition-all active:scale-[0.98] hover:bg-slate-800 hover:border-blue-500/30 text-left"
          >
            <div className="absolute top-0 right-0 p-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:bg-blue-600/20"></div>
            <div className="flex items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-6">
                <div className="p-4 sm:p-6 bg-blue-500/20 text-blue-400 rounded-3xl ring-4 ring-white/5 group-hover:scale-110 transition-transform">
                  {loadingMap ? <Loader2 className="w-8 h-8 animate-spin"/> : <Globe className="w-8 h-8" />}
                </div>
                <div>
                   <h3 className="text-xl sm:text-2xl font-black text-white tracking-tighter">Explorar Mapa Global</h3>
                   <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Localização em Tempo Real • Ativos Georreferenciados</p>
                </div>
              </div>
              <div className="hidden sm:flex w-12 h-12 rounded-full bg-slate-700 items-center justify-center group-hover:bg-blue-600 transition-colors">
                 <ArrowRight className="w-6 h-6 text-white" />
              </div>
            </div>
          </button>
        </header>

        <section className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 pb-12">
          {Object.entries(groupsConfig).map(([key, group]) => (
             <button 
              key={key} 
              onClick={() => setCurrentView(key as GroupType)} 
              className="relative overflow-hidden group bg-slate-800/40 backdrop-blur-2xl p-6 sm:p-8 rounded-[2rem] border border-slate-700/50 flex flex-col items-start transition-all active:scale-95 shadow-xl hover:bg-slate-700/60"
             >
               <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl ${group.lightColor} ${group.textColor} flex items-center justify-center mb-5 ring-4 ring-white/5 group-hover:scale-110 transition-transform`}><group.icon className="w-6 h-6 sm:w-8 sm:h-8" /></div>
               <h2 className="text-xl font-black mb-2 tracking-tighter">{group.label}</h2>
               <div className={`inline-flex items-center gap-2 font-black text-[8px] uppercase tracking-widest ${group.textColor}`}>Acessar <ArrowRight className="w-3 h-3" /></div>
             </button>
          ))}
        </section>
      </div>
      
      <footer className="py-8 text-center mt-auto">
        <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">&copy; 2024 TagFinder Enterprise • Monitoramento & Gestão de Ativos</p>
      </footer>
    </div>
  );
};

export default Dashboard;