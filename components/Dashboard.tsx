
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
import { LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, MapPin, Loader2, Navigation, Edit, X, Globe, Trash2, Crosshair, Server, CheckCircle, Database, Clock, Navigation2, Maximize, Locate, Activity, MapPinOff } from 'lucide-react';

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

// Usando Google Satellite para máximo realismo e disponibilidade
const SATELLITE_URL = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
const SATELLITE_ATTRIBUTION = '&copy; Google Maps';

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
        touchZoom: false,
        doubleClickZoom: false
      }).setView([lat, lng], 18);
      
      L.tileLayer(SATELLITE_URL, { attribution: SATELLITE_ATTRIBUTION }).addTo(map);

      const marker = L.circleMarker([lat, lng], {
        radius: 8, fillColor: '#3b82f6', color: '#ffffff', weight: 3, opacity: 1, fillOpacity: 1
      }).addTo(map);
      
      marker.bindTooltip(tag || "Alvo", { permanent: true, direction: 'top', className: 'tag-label' }).openTooltip();
      mapInstance.current = map;
      
      setTimeout(() => map.invalidateSize(), 200);
    } catch (e) { console.error("MiniMap error:", e); }

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [lat, lng, tag]);

  return <div ref={mapRef} className="w-full h-40 rounded-2xl border-2 border-slate-700 overflow-hidden mt-2 shadow-2xl relative z-0" />;
};

const GlobalMapModal: React.FC<{ items: GroupItem[], onClose: () => void, onSelectItem: (item: GroupItem) => void }> = ({ items, onClose, onSelectItem }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const initialFitDone = useRef(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.log("GPS erro:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || typeof L === 'undefined') return;
    
    try {
      const map = L.map(mapRef.current, { zoomControl: true, tap: true }).setView([-15.7801, -47.9292], 4);
      L.tileLayer(SATELLITE_URL, { attribution: SATELLITE_ATTRIBUTION, maxZoom: 21 }).addTo(map);
      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
      
      setTimeout(() => {
        map.invalidateSize();
        if (initialFitDone.current) return;
        const bounds = L.latLngBounds([]);
        let hasBounds = false;
        items.forEach(item => {
          const geo = item.data?.["Geolocalização"];
          if (geo) {
            const parts = geo.split(',');
            const la = parseFloat(parts[0]);
            const ln = parseFloat(parts[1]);
            if(!isNaN(la)) { bounds.extend([la, ln]); hasBounds = true; }
          }
        });
        if(hasBounds) map.fitBounds(bounds, { padding: [50, 50] });
        initialFitDone.current = true;
      }, 400);
    } catch (e) { console.error("Map init error:", e); }
  }, [items]);

  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    if (userPos) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userPos);
      } else {
        userMarkerRef.current = L.circleMarker(userPos, {
          radius: 12, fillColor: '#3b82f6', color: '#ffffff', weight: 4, opacity: 1, fillOpacity: 0.8, className: 'user-marker-pulse'
        }).addTo(mapInstance.current);
        userMarkerRef.current.bindTooltip("Você", { permanent: false, direction: 'top' });
      }
    }

    items.forEach(item => {
      const geo = item.data?.["Geolocalização"];
      if (geo && geo.trim() !== "") {
        const parts = geo.split(',').map((p: string) => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0])) {
          const [lat, lng] = parts;
          let color = '#3b82f6'; // ctv
          if (item.groupType === 'telecom') color = '#6366f1';
          if (item.groupType === 'painel') color = '#f97316';
          if (item.groupType === 'embarcados') color = '#10b981';
          
          const marker = L.circleMarker([lat, lng], {
            radius: 12, fillColor: color, color: '#ffffff', weight: 3, opacity: 1, fillOpacity: 1
          });
          
          const tagName = item.data?.["Tag"] || "Equipamento";
          marker.bindTooltip(tagName, { permanent: true, direction: 'top', className: 'tag-label', offset: [0, -8] });
          
          const popupContent = document.createElement('div');
          popupContent.className = "p-2 min-w-[140px]";
          popupContent.innerHTML = `
            <p class="text-[10px] font-black text-slate-900 uppercase mb-3 text-center border-b pb-1">${tagName}</p>
            <div class="flex flex-col gap-2">
               <button id="view-details-${item.id}" class="bg-blue-600 text-white px-3 py-2 rounded text-[9px] font-black cursor-pointer uppercase tracking-widest">Abrir Ativo</button>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.on('popupopen', () => {
             const btn = document.getElementById(`view-details-${item.id}`);
             if (btn) btn.onclick = () => { onSelectItem(item); onClose(); };
          });
          layerGroupRef.current.addLayer(marker);
        }
      }
    });
  }, [items, userPos]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-800 w-full h-[95vh] sm:h-[90vh] sm:max-w-6xl sm:rounded-[2.5rem] overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20"><Globe className="w-5 h-5" /></div>
             <div>
               <h3 className="font-black text-white text-base tracking-tighter uppercase leading-none">Visão Satélite Híbrida</h3>
               <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Sistema de Alta Precisão</span>
             </div>
          </div>
          <div className="flex gap-2.5">
            <button onClick={() => userPos && mapInstance.current?.setView(userPos, 19, {animate: true})} className="p-2.5 bg-blue-600 text-white rounded-xl active:scale-95 transition-all"><Locate className="w-6 h-6" /></button>
            <button onClick={onClose} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl active:scale-95"><X className="w-6 h-6" /></button>
          </div>
        </div>
        <div className="flex-1 relative bg-slate-900">
            <div ref={mapRef} className="absolute inset-0 z-0" />
            
            <div className="absolute bottom-6 left-6 z-[1000] p-4 bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-white/10 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${userPos ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{userPos ? 'GPS Conectado' : 'Buscando Localização...'}</span>
                </div>
            </div>
            
            <style>{`
                .user-marker-pulse { animation: pulse-blue 2.5s infinite; }
                @keyframes pulse-blue {
                    0% { stroke-width: 4px; stroke: #fff; r: 10; }
                    50% { stroke-width: 15px; stroke: rgba(59, 130, 246, 0.4); r: 15; }
                    100% { stroke-width: 4px; stroke: #fff; r: 10; }
                }
            `}</style>
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
              // Se location for null, remove os campos explicitamente para o Firestore refletir a exclusão
              finalData["Geolocalização"] = "";
              finalData["Link Maps"] = "";
          }
          
          await updateDoc(docRef, { 
            data: finalData, 
            content: finalData["Tag"] ? `Item: ${finalData["Tag"]}` : item.content 
          });
          setIsEditing(false);
      } catch (e) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  return (
      <div className="bg-slate-900 min-h-screen sm:min-h-[500px] sm:rounded-[2.5rem] border-x sm:border border-slate-700 shadow-2xl overflow-hidden flex flex-col animate-slideUp">
          <div className={`p-5 sm:p-8 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-20`}>
              <div className="flex items-center gap-4">
                  <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"><ArrowLeft className="w-5 h-5" /></button>
                  <h2 className="text-xl font-black tracking-tighter uppercase truncate">{isEditing ? "Edição" : (editData["Tag"] || "Detalhes")}</h2>
              </div>
              {!isEditing && (
                 <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white/20 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all hover:bg-white/30"><Edit className="w-4 h-4" /> Editar</button>
              )}
          </div>
          <div className="p-6 sm:p-10 space-y-8 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 flex flex-col gap-4 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl border-2 ${location ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}><MapPin className="w-6 h-6" /></div>
                      <div className="flex-1">
                         <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Coordenadas Atuais</h4>
                         <p className="text-sm text-slate-200 font-mono font-black">{location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : "Não Vinculado"}</p>
                      </div>
                      {isEditing && location && (
                        <button 
                          onClick={() => { if(confirm("Remover marcação do mapa?")) setLocation(null); }} 
                          className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 border border-red-500/20"
                          title="Excluir marcação"
                        >
                          <MapPinOff className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    {location && <MiniMapPreview lat={location.lat} lng={location.lng} tag={editData["Tag"]} />}
                    <div className="grid grid-cols-1 gap-2">
                        {isEditing ? (
                            <button onClick={() => { setGettingLocation(true); navigator.geolocation.getCurrentPosition(p => { setLocation({lat:p.coords.latitude, lng:p.coords.longitude}); setGettingLocation(false); }, () => setGettingLocation(false), {enableHighAccuracy:true}) }} className="w-full py-4 bg-blue-600 text-white text-[10px] font-black uppercase rounded-2xl flex items-center justify-center gap-2 transition-all">{gettingLocation ? <Loader2 className="animate-spin w-4 h-4"/> : <Crosshair className="w-4 h-4"/>} Capturar GPS Atual</button>
                        ) : location && (
                            <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`, '_blank')} className="w-full py-4 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-2xl flex items-center justify-center gap-2"><Navigation2 className="w-4 h-4" /> Traçar Rota</button>
                        )}
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 flex flex-col justify-center gap-2">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Registrado em</h4>
                    <p className="text-xl text-slate-200 font-black uppercase">{item.createdAt ? item.createdAt.toDate().toLocaleDateString('pt-BR') : "---"}</p>
                </div>
              </div>
              <div className="space-y-4">
                 <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">Ficha de Dados Técnica</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(editData).filter(([k]) => !k.toLowerCase().includes('geo') && !k.toLowerCase().includes('link')).map(([key, value]) => (
                        <div key={key} className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                          <h5 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2"><Database className="inline w-3 h-3 mr-1" /> {key}</h5>
                          {isEditing ? (
                            <input type="text" value={String(value)} onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm font-black focus:border-blue-500 outline-none shadow-inner" />
                          ) : (
                            <p className="text-white font-black text-base uppercase">{String(value)}</p>
                          )}
                        </div>
                    ))}
                 </div>
              </div>
              {isEditing && (
                <div className="grid grid-cols-2 gap-5 pt-6">
                    <button onClick={() => confirm("Excluir registro permanentemente?") && onDelete(item.id)} className="py-6 rounded-3xl bg-red-600/10 text-red-500 font-black uppercase text-[11px] border border-red-500/20 hover:bg-red-600/20">Excluir Permanente</button>
                    <button onClick={handleSave} disabled={isSaving} className={`py-6 rounded-3xl text-white font-black uppercase text-[11px] ${config.color} shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all`}>
                        {isSaving ? <Loader2 className="animate-spin w-6 h-6"/> : <Save className="w-6 h-6"/>} Salvar e Finalizar
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
  const localValue = data["Local"] || "Não definido";
  const hasGeo = !!data["Geolocalização"] && data["Geolocalização"].trim() !== "";

  return (
    <div onClick={onSelect} className="relative flex flex-col bg-slate-800/40 backdrop-blur-xl rounded-[2rem] border border-slate-700/60 p-1 shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer active:scale-95 group overflow-hidden border-b-4 border-b-transparent hover:border-b-blue-500">
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-white truncate tracking-tighter uppercase"><HighlightedText text={tagValue} highlight={searchHighlight} /></h3>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
             <button onClick={(e) => onEdit(e, item)} className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 border border-blue-500/20"><Edit className="w-4 h-4" /></button>
             <button onClick={(e) => onDelete(e, item.id)} className="p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 border border-red-500/20"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-slate-400 bg-slate-900/40 px-3 py-2 rounded-2xl border border-white/5">
          <MapPin className={`w-4 h-4 ${hasGeo ? 'text-emerald-500' : 'text-slate-600'}`} />
          <span className="text-[10px] font-black truncate uppercase tracking-tight">{localValue}</span>
        </div>
        <div className="flex items-center justify-between text-[9px] font-black text-slate-500 pt-3 border-t border-white/5 uppercase tracking-widest">
           <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${hasGeo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>{config.label}</div>
           <span className={hasGeo ? 'text-emerald-500' : ''}>{hasGeo ? 'LOCALIZADO' : 'S/ MAPA'}</span>
        </div>
      </div>
    </div>
  );
};

/* Corrected commas instead of semicolons in props destructuring and state hooks */
const GroupPage: React.FC<{ groupKey: GroupType, user: User, onBack: () => void, initialSelectedItem?: GroupItem | null }> = ({ groupKey, user, onBack, initialSelectedItem }) => {
  const config = groupsConfig[groupKey];
  const [items, setItems] = useState<GroupItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GroupItem | null>(initialSelectedItem || null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '' });
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
      let data: any = { "Tag": formData.tag, "Local": formData.local };
      if (groupKey === 'painel') {
          data = { ...data, "Switch1": formData.switch1, "Switch2": formData.switch2, "Switch3": formData.switch3 };
      } else {
          data = { ...data, "IP / Identificador": formData.ip };
      }
      if (location) {
        data["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
        data["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      }
      await addDoc(collection(db, groupKey), { content: `Item: ${formData.tag}`, data, userId: user.uid, userEmail: user.email, createdAt: serverTimestamp() });
      setIsModalOpen(false);
      setFormData({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '' });
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
      <div className="p-8 sm:p-12 mb-8 bg-slate-800/60 rounded-[3rem] border border-slate-700 flex flex-col gap-8 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-4 bg-slate-700 rounded-2xl text-slate-300 transition-all hover:bg-slate-600 border border-white/5 active:scale-90"><ArrowLeft className="w-7 h-7" /></button>
            <div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none">{config.label}</h2>
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-500 mt-2 block">Central de Ativos Industriais</span>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className={`hidden sm:flex px-8 py-4 rounded-2xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[11px] tracking-widest items-center gap-3 shadow-2xl hover:scale-105 active:scale-95 transition-all`}>
            <Plus className="w-5 h-5" /> Novo Registro
          </button>
        </div>
      </div>

      <div className="relative mb-10 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
        <input type="text" placeholder={`Buscar por tag, IP, switch ou local...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-slate-800/80 border border-slate-700 rounded-3xl text-white text-lg outline-none font-black placeholder-slate-600 shadow-2xl focus:border-blue-500 transition-all backdrop-blur-md" />
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredItems.map(item => <ItemCard key={item.id} item={item} config={config} onSelect={() => setSelectedItem(item)} onDelete={(e, id) => { e.stopPropagation(); confirm("Remover?") && deleteDoc(doc(db, groupKey, id)) }} onEdit={(e, i) => { e.stopPropagation(); setSelectedItem(i); }} searchHighlight={searchTerm} />)}
      </div>

      <button onClick={() => setIsModalOpen(true)} className={`fixed bottom-8 right-8 w-20 h-20 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl z-40 bg-gradient-to-r ${config.gradient} hover:scale-110 active:scale-90 transition-all border-2 border-white/20`}><Plus className="w-10 h-10" /></button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
          <div className="bg-slate-800 w-full h-[95vh] sm:h-auto sm:max-w-md sm:rounded-[3rem] border-t sm:border border-slate-600 overflow-y-auto shadow-2xl">
            <div className={`p-7 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10 shadow-xl`}>
              <h3 className="text-xl font-black tracking-tighter uppercase leading-none">Novo Cadastro</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-7 space-y-6">
              <button type="button" onClick={() => { setGettingLocation(true); navigator.geolocation.getCurrentPosition(p => { setLocation({lat: p.coords.latitude, lng: p.coords.longitude}); setGettingLocation(false); }, () => setGettingLocation(false), {enableHighAccuracy: true}) }} className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2 transition-all shadow-xl ${location ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-blue-400 border border-slate-600'}`}>
                {gettingLocation ? <Loader2 className="animate-spin w-5 h-5"/> : location ? <CheckCircle className="w-5 h-5"/> : <Crosshair className="w-5 h-5"/>} 
                {location ? "LOCALIZAÇÃO GPS OK" : "OBTER COORDENADAS"}
              </button>
              
              {location && <MiniMapPreview lat={location.lat} lng={location.lng} tag={formData.tag} />}

              <div className="space-y-4">
                <input type="text" placeholder="Tag do Ativo" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-base font-black uppercase focus:border-blue-500 outline-none transition-all" />
                <input type="text" placeholder="Localização Técnica" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-sm font-black uppercase focus:border-blue-500 outline-none" />
                {groupKey === 'painel' ? (
                   ['switch1', 'switch2', 'switch3'].map((sw, i) => <input key={sw} type="text" placeholder={`Link Switch ${i+1}`} value={formData[sw]} onChange={e => setFormData({...formData, [sw]: e.target.value})} className="w-full px-5 py-3 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-sm font-mono focus:border-blue-500 outline-none" />)
                ) : (
                   <input type="text" placeholder="Endereço IP / Identificador" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-sm font-mono focus:border-blue-500 outline-none" />
                )}
              </div>
              <button type="submit" disabled={loading} className={`w-full py-6 rounded-3xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all disabled:opacity-50`}>
                 {loading ? <Loader2 className="animate-spin w-6 h-6"/> : "Concluir Cadastro"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* Corrected commas instead of semicolons in state hooks */
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
    <div className="min-h-screen bg-slate-900 p-6 sm:p-16 text-white relative flex flex-col">
      <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>
      
      {isMapModalOpen && <GlobalMapModal items={allMapItems} onClose={() => setIsMapModalOpen(false)} onSelectItem={(item) => { setItemFromMap(item); setCurrentView(item.groupType as GroupType); }} />}
      
      <div className="max-w-6xl mx-auto w-full space-y-12 animate-fadeIn relative z-10 flex-1">
        <header className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></div> TagFinder Pro v4
            </div>
            <button onClick={() => signOut(auth)} className="p-4 bg-slate-800 border border-slate-700 rounded-2xl text-slate-500 hover:text-red-500 transition-all active:scale-90 shadow-2xl"><LogOut className="w-6 h-6" /></button>
          </div>
          
          <div>
            <h1 className="text-4xl sm:text-7xl font-black tracking-tighter leading-none uppercase">
              Bem-vindo, <br/><span className="text-blue-500 drop-shadow-2xl">{user.displayName || user.email?.split('@')[0]}</span>
            </h1>
            <p className="text-slate-500 text-sm sm:text-lg font-bold uppercase tracking-wider mt-4 opacity-70">Sistema Georreferenciado de Inventário Industrial</p>
          </div>

          <button 
            onClick={handleOpenGlobalMap} 
            disabled={loadingMap} 
            className="group relative overflow-hidden w-full p-10 sm:p-14 rounded-[3.5rem] bg-slate-800/60 border border-slate-700 shadow-2xl transition-all active:scale-[0.98] hover:bg-slate-800 hover:border-blue-500/30 text-left"
          >
            <div className="absolute top-0 right-0 p-48 bg-blue-600/10 rounded-full blur-[120px] -mr-24 -mt-24"></div>
            <div className="flex items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-8">
                <div className="p-6 sm:p-8 bg-blue-500/20 text-blue-400 rounded-[2.5rem] ring-8 ring-white/5 group-hover:scale-110 transition-all shadow-2xl">
                  {loadingMap ? <Loader2 className="w-10 h-10 animate-spin"/> : <Globe className="w-10 h-10" />}
                </div>
                <div>
                   <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase leading-none">Mapa Geral Satélite</h3>
                   <p className="text-slate-400 text-[10px] sm:text-[12px] font-black uppercase tracking-widest mt-3 opacity-60">Visão Híbrida de Alta Resolução • Ativos Ativos</p>
                </div>
              </div>
              <div className="hidden sm:flex w-16 h-16 rounded-full bg-slate-700 items-center justify-center group-hover:bg-blue-600 transition-all shadow-2xl">
                 <ArrowRight className="w-8 h-8 text-white" />
              </div>
            </div>
          </button>
        </header>

        <section className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-6 pb-16">
          {Object.entries(groupsConfig).map(([key, group]) => (
             <button key={key} onClick={() => setCurrentView(key as GroupType)} className="relative overflow-hidden group bg-slate-800/40 backdrop-blur-2xl p-8 sm:p-10 rounded-[3rem] border border-slate-700/50 flex flex-col items-start transition-all active:scale-95 shadow-2xl hover:bg-slate-700/60">
               <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-3xl ${group.lightColor} ${group.textColor} flex items-center justify-center mb-8 ring-8 ring-white/5 shadow-2xl border border-white/5`}><group.icon className="w-8 h-8 sm:w-10 sm:h-10" /></div>
               <h2 className="text-2xl font-black mb-3 tracking-tighter uppercase leading-none">{group.label}</h2>
               <div className={`inline-flex items-center gap-3 font-black text-[9px] uppercase tracking-widest ${group.textColor}`}>Gerenciar Inventário <ArrowRight className="w-4 h-4" /></div>
             </button>
          ))}
        </section>
      </div>
      
      <footer className="py-12 text-center mt-auto border-t border-white/5">
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] opacity-50">TagFinder Enterprise Cloud &copy; 2024 • Tecnologia Geográfica Avançada</p>
      </footer>
    </div>
  );
};

export default Dashboard;
