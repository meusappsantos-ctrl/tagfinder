
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { 
  LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, 
  MapPin, Loader2, Edit, X, Globe, Trash2, Crosshair, Server, 
  CheckCircle, Database, Clock, Navigation2, Locate, MapPinOff, 
  Filter, Map as MapIcon
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
type ViewState = 'home' | GroupType | 'search_results';

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
        <span key={i} className="bg-yellow-500/40 text-yellow-100 rounded px-0.5 font-bold shadow-sm">{part}</span>
      ) : part)}
    </span>
  );
};

const MiniMapPreview: React.FC<{ lat: number, lng: number, tag: string }> = ({ lat, lng, tag }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    if (mapInstance.current) {
        mapInstance.current.setView([lat, lng], 18);
        // Add or update marker
        if (mapInstance.current._marker) {
          mapInstance.current._marker.setLatLng([lat, lng]);
        } else {
          mapInstance.current._marker = L.circleMarker([lat, lng], { radius: 8, fillColor: '#3b82f6', color: '#ffffff', weight: 3, opacity: 1, fillOpacity: 1 }).addTo(mapInstance.current);
        }
        return;
    }
    try {
      const map = L.map(mapRef.current, { 
        zoomControl: false, attributionControl: false, dragging: true,
        scrollWheelZoom: false, touchZoom: true, maxZoom: 22
      }).setView([lat, lng], 18);
      L.tileLayer(GOOGLE_HYBRID_URL, { attribution: SATELLITE_ATTRIBUTION, maxZoom: 22, maxNativeZoom: 19 }).addTo(map);
      mapInstance.current = map;
      mapInstance.current._marker = L.circleMarker([lat, lng], { radius: 8, fillColor: '#3b82f6', color: '#ffffff', weight: 3, opacity: 1, fillOpacity: 1 }).addTo(map);
      setTimeout(() => map.invalidateSize(), 300);
    } catch (e) { console.error("MiniMap error:", e); }
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [lat, lng, tag]);

  return <div ref={mapRef} className="w-full h-full rounded-2xl border border-slate-700 overflow-hidden shadow-inner bg-slate-900" />;
};

const ItemDetail: React.FC<{
  item: GroupItem;
  groupKey: GroupType;
  config: any;
  user: User;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}> = ({ item, groupKey, config, user, onClose, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>(item.data || {});
  
  const geo = editData["Geolocalização"];
  let coords: [number, number] | null = null;
  if (geo) {
    const parts = geo.split(',').map((p: string) => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0])) coords = [parts[0], parts[1]];
  }

  const handleCapture = () => {
    setIsCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(7);
        const lng = pos.coords.longitude.toFixed(7);
        setEditData(prev => ({
          ...prev,
          "Geolocalização": `${lat}, ${lng}`,
          "Link Maps": `https://maps.google.com/?q=${lat},${lng}`
        }));
        setIsCapturing(false);
      },
      (err) => {
        setIsCapturing(false);
        alert(`Erro ao capturar GPS: ${err.message}. Verifique as permissões do navegador.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleRemoveLocation = () => {
    if (window.confirm("Deseja remover as coordenadas geográficas deste ativo?")) {
      setEditData(prev => {
        const newData = { ...prev };
        delete newData["Geolocalização"];
        delete newData["Link Maps"];
        return newData;
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, groupKey, item.id), { 
        data: editData,
        content: `Item: ${editData["Tag"] || item.content}`
      });
      setIsEditing(false);
    } catch (e) { alert('Erro ao salvar'); } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      setIsDeleting(true);
      try { await onDelete(item.id); } catch (e) { setIsDeleting(false); }
    }
  };

  return (
    <div className="animate-fadeIn space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="p-4 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all flex items-center gap-2 group">
          <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Voltar</span>
        </button>
        <div className="flex gap-2">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="px-6 py-4 bg-blue-500/10 text-blue-400 rounded-2xl font-black text-xs uppercase hover:bg-blue-500 hover:text-white transition-all">Editar</button>
          ) : (
            <button onClick={handleSave} disabled={isSaving} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-emerald-500/20">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar
            </button>
          )}
          <button onClick={handleDelete} disabled={isDeleting} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
            {isDeleting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Trash2 className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className={`p-8 rounded-[2.5rem] bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 p-6 ${config.textColor} opacity-20`}><config.icon className="w-16 h-16" /></div>
            <div className="relative z-10">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.lightColor} ${config.textColor} text-[10px] font-black uppercase tracking-widest mb-4 border border-white/5`}>{config.label}</div>
              {isEditing ? (
                <input type="text" value={editData["Tag"] || ""} onChange={e => setEditData({...editData, "Tag": e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-2xl font-black text-white uppercase outline-none focus:border-blue-500 mb-2"/>
              ) : (
                <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter mb-2">{editData["Tag"] || item.content}</h2>
              )}
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" /> Registrado em {item.createdAt?.toDate().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {Object.entries(editData).map(([key, value]) => {
              if (key === "Geolocalização" || key === "Link Maps" || key === "Tag") return null;
              return (
                <div key={key} className="p-6 bg-slate-800/20 border border-slate-700/30 rounded-3xl flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{key}</span>
                  {isEditing ? (
                    <input type="text" value={String(value)} onChange={e => setEditData({...editData, [key]: e.target.value})} className="bg-transparent border-b border-slate-600 text-lg font-bold text-white uppercase outline-none focus:border-blue-500 py-1" />
                  ) : (
                    <span className="text-lg font-bold text-white uppercase break-all">{String(value)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Locate className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Localização Geográfica</h3>
              </div>
              {coords && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-blue-400 uppercase hover:underline flex items-center gap-1">
                  Abrir no Maps <Globe className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="h-96 rounded-[2.5rem] border border-slate-700 overflow-hidden shadow-2xl relative bg-slate-900 group/map">
              {coords ? <MiniMapPreview lat={coords[0]} lng={coords[1]} tag={editData["Tag"] || "Equipamento"} /> : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-4">
                  <MapPinOff className="w-16 h-16 opacity-20"/>
                  <span className="text-xs font-black uppercase tracking-widest opacity-40">Sem Georreferenciamento</span>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex flex-col gap-2">
                <button onClick={handleCapture} disabled={isCapturing} className={`w-full py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-xl transition-all ${isCapturing ? 'bg-slate-700 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                  {isCapturing ? <Loader2 className="w-5 h-5 animate-spin"/> : <Crosshair className="w-5 h-5"/>}
                  {isCapturing ? "Aguardando GPS..." : "Capturar Nova Localização"}
                </button>
                {coords && (
                  <button onClick={handleRemoveLocation} className="w-full py-3 rounded-2xl font-black text-[10px] uppercase text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20">
                    Remover Localização Atual
                  </button>
                )}
              </div>
            )}

            {coords && (
              <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Navigation2 className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">Coordenadas</p>
                    <p className="text-xs font-mono text-blue-200">{coords[0].toFixed(6)}, {coords[1].toFixed(6)}</p>
                  </div>
                </div>
                <button onClick={() => navigator.clipboard.writeText(`${coords![0]}, ${coords![1]}`)} className="px-4 py-2 bg-slate-700 rounded-xl text-[10px] font-black text-white uppercase hover:bg-slate-600 transition-all">Copiar</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const GlobalMapModal: React.FC<{ items: GroupItem[], onClose: () => void, onSelectItem: (item: GroupItem) => void }> = ({ items, onClose, onSelectItem }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.log("GPS erro:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || typeof L === 'undefined') return;
    try {
      const map = L.map(mapRef.current, { zoomControl: true, tap: true, maxZoom: 22 }).setView([-15.7801, -47.9292], 4);
      L.tileLayer(GOOGLE_HYBRID_URL, { attribution: SATELLITE_ATTRIBUTION, maxZoom: 22, maxNativeZoom: 19 }).addTo(map);
      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
      setTimeout(() => map.invalidateSize(), 500);
    } catch (e) { console.error("Map init error:", e); }
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();
    const bounds = L.latLngBounds([]);
    let hasBounds = false;

    if (userPos) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.circleMarker(userPos, {
          radius: 12, fillColor: '#3b82f6', color: '#ffffff', weight: 3, opacity: 1, fillOpacity: 0.8, className: 'user-marker-pulse'
        }).addTo(mapInstance.current);
      } else {
        userMarkerRef.current.setLatLng(userPos);
      }
      bounds.extend(userPos);
      hasBounds = true;
    }

    items.forEach(item => {
      const geo = item.data?.["Geolocalização"];
      if (geo) {
        const parts = geo.split(',').map((p: string) => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0])) {
          const [lat, lng] = parts;
          let color = groupsConfig[item.groupType as GroupType]?.textColor.replace('text-', '#') || '#3b82f6';
          const marker = L.circleMarker([lat, lng], { radius: 10, fillColor: color, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1 });
          const tagName = item.data?.["Tag"] || "Equipamento";
          marker.bindTooltip(tagName, { permanent: true, direction: 'top', className: 'tag-label', offset: [0, -8] });
          const popup = L.popup().setContent(`
            <div class="p-2 flex flex-col gap-2">
              <p class="text-[10px] font-black uppercase text-slate-800">${tagName}</p>
              <button id="view-${item.id}" class="bg-blue-600 text-white px-3 py-2 rounded text-[9px] font-black uppercase">Ver Detalhes</button>
            </div>
          `);
          marker.bindPopup(popup);
          marker.on('popupopen', () => {
             const btn = document.getElementById(`view-${item.id}`);
             if (btn) btn.onclick = () => { onSelectItem(item); onClose(); };
          });
          layerGroupRef.current.addLayer(marker);
          bounds.extend([lat, lng]);
          hasBounds = true;
        }
      }
    });

    if (hasBounds && mapInstance.current) mapInstance.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 });
  }, [items, userPos, onSelectItem, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-800 w-full h-[95vh] sm:h-[85vh] sm:max-w-6xl sm:rounded-[2.5rem] overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl"><Globe className="w-5 h-5" /></div>
             <h3 className="font-black text-white text-base tracking-tighter uppercase">Painel Satélite de Ativos</h3>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-700 rounded-xl text-slate-400 active:scale-90 transition-all"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 relative bg-slate-900"><div ref={mapRef} className="absolute inset-0" /></div>
      </div>
    </div>
  );
};

const ItemCard: React.FC<{ item: GroupItem; onSelect: () => void; searchHighlight: string; }> = ({ item, onSelect, searchHighlight }) => {
  const config = groupsConfig[item.groupType as GroupType];
  const data = item.data || {};
  const tagValue = data["Tag"] || item.content;
  const localValue = data["Local"] || "Não definido";
  const hasGeo = !!data["Geolocalização"];

  return (
    <div onClick={onSelect} className="relative flex flex-col bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer active:scale-95 group overflow-hidden">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-white truncate uppercase tracking-tighter"><HighlightedText text={tagValue} highlight={searchHighlight} /></h3>
          <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${config.textColor} ${config.textColor === 'text-orange-400' ? 'bg-orange-900/40' : config.lightColor} border border-white/5`}>{config.label}</div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 bg-slate-900/40 px-3 py-2 rounded-xl border border-white/5">
          <MapPin className={`w-3.5 h-3.5 ${hasGeo ? 'text-emerald-500' : 'text-slate-600'}`} />
          <span className="text-[10px] font-black truncate uppercase tracking-tight">{localValue}</span>
        </div>
        {item.groupType === 'painel' && (
          <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
            {['Switch1', 'Switch2', 'Switch3'].map(sw => data[sw] && (
              <div key={sw} className="flex items-center gap-2 px-2 py-1 bg-slate-900/50 rounded-lg">
                <Server className="w-3 h-3 text-blue-400" />
                <span className="text-[8px] font-mono text-slate-300 uppercase truncate"><HighlightedText text={data[sw]} highlight={searchHighlight} /></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [globalSearch, setGlobalSearch] = useState('');
  const [allItems, setAllItems] = useState<GroupItem[]>([]);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GroupItem | null>(null);

  useEffect(() => {
    const colls: GroupType[] = ['ctv', 'telecom', 'painel', 'embarcados'];
    const unsubscribes = colls.map(type => 
      onSnapshot(query(collection(db, type), orderBy('createdAt', 'desc')), (snap) => {
        setAllItems(prev => {
          const others = prev.filter(i => i.groupType !== type);
          const news = snap.docs.map(d => ({ id: d.id, ...d.data(), groupType: type } as GroupItem));
          return [...others, ...news];
        });
      })
    );
    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const filteredItems = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const s = globalSearch.toLowerCase();
    return allItems.filter(i => {
      const tag = (i.data?.["Tag"] || "").toLowerCase();
      const local = (i.data?.["Local"] || "").toLowerCase();
      const ip = (i.data?.["IP / Identificador"] || "").toLowerCase();
      const switches = ['Switch1', 'Switch2', 'Switch3'].map(sw => (i.data?.[sw] || "").toLowerCase());
      return tag.includes(s) || local.includes(s) || ip.includes(s) || switches.some(v => v.includes(s));
    });
  }, [allItems, globalSearch]);

  if (selectedItem) return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-12">
      <div className="max-w-4xl mx-auto">
        <ItemDetail 
          item={selectedItem} 
          groupKey={selectedItem.groupType as GroupType} 
          config={groupsConfig[selectedItem.groupType as GroupType]} 
          user={user} 
          onClose={() => setSelectedItem(null)} 
          onDelete={(id) => deleteDoc(doc(db, selectedItem.groupType!, id)).then(() => setSelectedItem(null))} 
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 p-6 sm:p-16 text-white flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full"></div>
      {isMapModalOpen && <GlobalMapModal items={allItems} onClose={() => setIsMapModalOpen(false)} onSelectItem={setSelectedItem} />}
      <div className="max-w-6xl mx-auto w-full space-y-12 relative z-10">
        <header className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">TagFinder Pro v4</div>
            <button onClick={() => signOut(auth)} className="p-4 bg-slate-800 border border-slate-700 rounded-2xl text-slate-500 hover:text-red-500 active:scale-90 transition-all shadow-xl"><LogOut className="w-6 h-6" /></button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl sm:text-7xl font-black tracking-tighter uppercase leading-none">Olá, <span className="text-blue-500">{user.displayName || user.email?.split('@')[0]}</span></h1>
              <p className="text-slate-500 text-sm sm:text-lg font-bold uppercase tracking-wider mt-4">Gestão Unificada de Inventário Geográfico</p>
            </div>
            <button onClick={() => setIsMapModalOpen(true)} className="p-10 rounded-[2.5rem] bg-slate-800/80 border border-slate-700 shadow-2xl hover:border-blue-500/30 active:scale-95 transition-all text-left group">
                <div className="flex items-center gap-6">
                    <div className="p-6 bg-blue-500/10 text-blue-400 rounded-3xl group-hover:scale-110 transition-all"><Globe className="w-8 h-8" /></div>
                    <div><h3 className="text-xl font-black uppercase tracking-tighter">Explorar Mapa</h3><p className="text-[10px] font-bold text-slate-500 uppercase">Satélite Híbrido</p></div>
                </div>
            </button>
          </div>
          <div className="relative group max-w-2xl mx-auto sm:mx-0">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
             <input 
               type="text" 
               placeholder="Busca Global: Tag, Local, IP, Switch..." 
               value={globalSearch}
               onChange={(e) => { setGlobalSearch(e.target.value); if(currentView !== 'search_results' && e.target.value) setCurrentView('search_results'); if(!e.target.value) setCurrentView('home'); }}
               className="w-full pl-16 pr-6 py-6 bg-slate-800 border border-slate-700 rounded-[2.5rem] text-white text-xl font-black placeholder-slate-600 focus:border-blue-500 outline-none transition-all shadow-2xl" 
             />
             {globalSearch && <button onClick={() => { setGlobalSearch(''); setCurrentView('home'); }} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-all"><X className="w-5 h-5"/></button>}
          </div>
        </header>
        {currentView === 'search_results' ? (
          <main className="space-y-8 animate-slideUp">
            <div className="flex items-center justify-between">
               <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><Filter className="w-6 h-6 text-blue-500" /> Resultados Encontrados ({filteredItems.length})</h2>
               <button onClick={() => { setGlobalSearch(''); setCurrentView('home'); }} className="text-[10px] font-black uppercase text-slate-500 hover:text-white flex items-center gap-2">Limpar <ArrowRight className="w-4 h-4"/></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => <ItemCard key={item.id} item={item} onSelect={() => setSelectedItem(item)} searchHighlight={globalSearch} />)}
            </div>
          </main>
        ) : currentView === 'home' ? (
          <main className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
            {Object.entries(groupsConfig).map(([key, group]) => (
               <button key={key} onClick={() => setCurrentView(key as GroupType)} className="relative overflow-hidden group bg-slate-800/40 backdrop-blur-2xl p-10 rounded-[3rem] border border-slate-700/50 flex flex-col items-start transition-all active:scale-95 shadow-2xl hover:bg-slate-700/60">
                 <div className={`w-16 h-16 rounded-3xl ${group.lightColor} ${group.textColor} flex items-center justify-center mb-8 ring-8 ring-white/5 transition-all group-hover:scale-110`}><group.icon className="w-8 h-8" /></div>
                 <h2 className="text-2xl font-black mb-3 tracking-tighter uppercase leading-none">{group.label}</h2>
                 <div className={`inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${group.textColor}`}>Abrir <ArrowRight className="w-4 h-4" /></div>
               </button>
            ))}
          </main>
        ) : (
          <div className="animate-fadeIn">
             <GroupPage groupKey={currentView as GroupType} user={user} onBack={() => setCurrentView('home')} onSelectItem={setSelectedItem} />
          </div>
        )}
      </div>
    </div>
  );
};

const GroupPage: React.FC<{ groupKey: GroupType; user: User; onBack: () => void; onSelectItem: (i: GroupItem) => void }> = ({ groupKey, user, onBack, onSelectItem }) => {
  const config = groupsConfig[groupKey];
  const [items, setItems] = useState<GroupItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '' });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    return onSnapshot(query(collection(db, groupKey), orderBy('createdAt', 'desc')), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data(), groupType: groupKey } as GroupItem)));
    });
  }, [groupKey]);

  const handleCapture = () => {
    setIsCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsCapturing(false);
      },
      (err) => {
        setIsCapturing(false);
        alert(`Erro ao capturar GPS: ${err.message}. Verifique as permissões de localização.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleRemoveLocation = () => {
    setLocation(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalLocal = formData.local === "NOVO" ? formData.customLocal : formData.local;
      const finalEquip = formData.equipamento === "NOVO" ? formData.customEquipamento : formData.equipamento;
      
      let data: any = { "Tag": formData.tag, "Local": finalLocal };
      if (groupKey === 'painel') {
          data = { ...data, "Switch1": formData.switch1, "Switch2": formData.switch2, "Switch3": formData.switch3, "Equipamento": finalEquip };
      } else { data = { ...data, "IP / Identificador": formData.ip }; }
      
      if (location) {
        data["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
        data["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      }
      
      await addDoc(collection(db, groupKey), { content: `Item: ${formData.tag}`, data, userId: user.uid, userEmail: user.email, createdAt: serverTimestamp() });
      setIsModalOpen(false);
      setFormData({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '' });
      setLocation(null);
    } catch (e) { alert('Erro ao salvar'); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-4 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all"><ArrowLeft className="w-6 h-6" /></button>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">{config.label}</h2>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={`px-8 py-4 rounded-2xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[11px] tracking-widest flex items-center gap-3 shadow-xl active:scale-95 transition-all`}>
          <Plus className="w-5 h-5" /> Novo Registro
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map(item => <ItemCard key={item.id} item={item} onSelect={() => onSelectItem(item)} searchHighlight="" />)}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-800 w-full max-w-md rounded-[3rem] border border-slate-700 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className={`p-8 bg-gradient-to-r ${config.gradient} flex justify-between items-center text-white shadow-lg`}>
               <h3 className="text-xl font-black uppercase tracking-tighter">Novo Cadastro</h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/10 rounded-xl"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5 overflow-y-auto custom-scrollbar">
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={handleCapture} disabled={isCapturing} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase border tracking-widest flex items-center justify-center gap-3 transition-all ${location ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-700 text-blue-400 border-slate-600'}`}>
                      {isCapturing ? <Loader2 className="w-5 h-5 animate-spin"/> : (location ? <CheckCircle className="w-5 h-5"/> : <Crosshair className="w-5 h-5"/>)} 
                      {isCapturing ? "Aguardando GPS..." : (location ? "GPS Capturado" : "Capturar Localização")}
                    </button>
                    {location && (
                      <button type="button" onClick={handleRemoveLocation} className="text-[9px] font-black uppercase text-red-500/60 hover:text-red-500 text-center">Remover GPS</button>
                    )}
                  </div>

                  {location && (
                    <div className="h-48 rounded-2xl overflow-hidden border border-slate-700 relative shadow-inner animate-slideUp">
                       <MiniMapPreview lat={location.lat} lng={location.lng} tag={formData.tag || "Novo Ativo"} />
                       <div className="absolute bottom-3 left-3 px-3 py-1 bg-slate-900/80 backdrop-blur rounded-lg border border-white/5 text-[8px] font-mono text-blue-300">
                         {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                       </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <input type="text" placeholder="Tag do Ativo" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white font-black uppercase focus:border-blue-500 outline-none transition-all" />
                  
                  {groupKey === 'painel' ? (
                     <>
                        <div className="grid grid-cols-1 gap-2">
                           <input type="text" placeholder="Link Switch 1" value={formData.switch1} onChange={e => setFormData({...formData, switch1: e.target.value})} className="w-full px-5 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-xs font-mono" />
                           <input type="text" placeholder="Link Switch 2" value={formData.switch2} onChange={e => setFormData({...formData, switch2: e.target.value})} className="w-full px-5 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-xs font-mono" />
                           <input type="text" placeholder="Link Switch 3" value={formData.switch3} onChange={e => setFormData({...formData, switch3: e.target.value})} className="w-full px-5 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-xs font-mono" />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sistema / Local</label>
                          <select value={formData.local} onChange={e => setFormData({...formData, local: e.target.value, equipamento: ''})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-black uppercase outline-none focus:border-blue-500 cursor-pointer">
                             <option value="">Selecione Local...</option>
                             {Object.keys(SYSTEM_DATA).map(l => <option key={l} value={l}>{l}</option>)}
                             <option value="NOVO" className="text-blue-400 font-bold">+ ADICIONAR NOVO LOCAL</option>
                          </select>
                        </div>
                        {formData.local === "NOVO" && <input type="text" placeholder="Nome do Novo Local" value={formData.customLocal} onChange={e => setFormData({...formData, customLocal: e.target.value})} className="w-full px-5 py-4 bg-slate-900 border border-blue-500/40 rounded-2xl text-white text-xs font-black uppercase outline-none" />}

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ativo / Equipamento</label>
                          <select disabled={!formData.local} value={formData.equipamento} onChange={e => setFormData({...formData, equipamento: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-black uppercase outline-none focus:border-blue-500 disabled:opacity-30 cursor-pointer">
                             <option value="">Selecione Ativo...</option>
                             {formData.local && SYSTEM_DATA[formData.local]?.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                             <option value="NOVO" className="text-blue-400 font-bold">+ ADICIONAR NOVO ATIVO</option>
                          </select>
                        </div>
                        {formData.equipamento === "NOVO" && <input type="text" placeholder="Nome do Novo Ativo" value={formData.customEquipamento} onChange={e => setFormData({...formData, customEquipamento: e.target.value})} className="w-full px-5 py-4 bg-slate-900 border border-blue-500/40 rounded-2xl text-white text-xs font-black uppercase outline-none" />}
                     </>
                  ) : (
                    <>
                       <input type="text" placeholder="Localização Técnica" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-sm font-black uppercase outline-none focus:border-blue-500 transition-all" />
                       <input type="text" placeholder="Endereço IP / Identificador" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white font-mono outline-none focus:border-blue-500 transition-all" />
                    </>
                  )}
                </div>
                <button type="submit" disabled={loading} className={`w-full py-6 rounded-3xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all mt-4`}>
                   {loading ? <Loader2 className="animate-spin w-6 h-6 mx-auto"/> : "Finalizar Cadastro"}
                </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
