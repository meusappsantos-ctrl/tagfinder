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
import { LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, MapPin, Loader2, Navigation, Edit, X, Globe, Trash2, Map as MapIcon, Crosshair, Server, ImageIcon, CheckCircle, ChevronRight, Hash, Database, Clock } from 'lucide-react';
// @ts-ignore
import { read, utils } from 'xlsx';

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

const GlobalMapModal: React.FC<{ items: GroupItem[], onClose: () => void }> = ({ items, onClose }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    if (typeof L === 'undefined') {
      console.error("Leaflet não carregado.");
      return;
    }
    
    try {
      const map = L.map(mapRef.current).setView([-15.7801, -47.9292], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      
      const bounds = L.latLngBounds([]);
      let hasMarkers = false;
      
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
            
            const circleMarker = L.circleMarker([lat, lng], {
              radius: 8, fillColor: color, color: '#0f172a', weight: 2, opacity: 1, fillOpacity: 0.9
            }).addTo(map);
            
            const tagName = item.data?.["Tag"] || item.content;
            circleMarker.bindPopup(`<div class="text-slate-900"><b>${tagName}</b><br><a href="https://maps.google.com/?q=${lat},${lng}" target="_blank">Ver no Google Maps</a></div>`);
            bounds.extend([lat, lng]);
            hasMarkers = true;
          }
        }
      });
      if (hasMarkers) map.fitBounds(bounds, { padding: [50, 50] });
      mapInstance.current = map;
    } catch (e) {
      console.error("Erro ao iniciar mapa:", e);
    }
    
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [items]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col h-[85vh] border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-900/30 text-blue-400 rounded-lg"><Globe className="w-5 h-5" /></div>
             <h3 className="font-bold text-white text-lg">Mapa Global</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg"><X className="w-6 h-6 text-slate-400" /></button>
        </div>
        <div className="flex-1 relative bg-slate-950"><div ref={mapRef} className="absolute inset-0 z-0" /></div>
      </div>
    </div>
  );
};

const ItemDetail: React.FC<{ item: GroupItem; groupKey: string; config: any; user: User; onClose: () => void; onDelete: (id: string) => void; }> = ({ item, groupKey, config, user, onClose, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>(item.data || {});
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
      () => { setGettingLocation(false); alert('GPS Falhou'); },
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

  // Extrai apenas a tag se o conteúdo vier com barras ou outros dados
  const displayTitle = isEditing 
    ? "Editando Registro" 
    : (editData["Tag"] || item.content.split('|')[0].trim().replace(/^Item:\s*/i, ''));

  return (
      <div className="bg-slate-900 min-h-[500px] rounded-3xl border border-slate-700 shadow-xl overflow-hidden flex flex-col animate-slideUp">
          <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10`}>
              <div className="flex items-center gap-4">
                  <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft className="w-6 h-6" /></button>
                  <h2 className="text-xl font-bold tracking-tight uppercase">{displayTitle}</h2>
              </div>
              <div className="flex gap-2">
                 {item.userId === user.uid && !isEditing && (
                     <><button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all">Editar</button>
                       <button onClick={() => { if(confirm("Deseja realmente excluir?")) onDelete(item.id) }} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-all"><Trash2 className="w-5 h-5" /></button></>
                 )}
                 {isEditing && <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-6 h-6" /></button>}
              </div>
          </div>
          <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex justify-between items-center shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><MapPin className="w-5 h-5" /></div>
                      <div><h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Localização GPS</h4><p className="text-sm text-slate-300 font-mono">{location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : "Não registrado"}</p></div>
                    </div>
                    {isEditing ? <button onClick={handleGetLocation} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all">{gettingLocation ? "Buscando..." : "Atualizar"}</button> : location && <button onClick={() => window.open(`https://maps.google.com/?q=${location.lat},${location.lng}`, '_blank')} className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs font-bold rounded-lg transition-all border border-green-600/30">Abrir Maps</button>}
                </div>
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex items-center gap-3 shadow-inner">
                    <div className="p-2 bg-slate-700/50 text-slate-400 rounded-lg"><Clock className="w-5 h-5" /></div>
                    <div><h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Criado em</h4><p className="text-sm text-slate-300">{item.createdAt ? item.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Indisponível"}</p></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Object.entries(editData)
                    .filter(([k]) => !k.toLowerCase().includes('geo') && !k.toLowerCase().includes('link') && !k.includes('__EMPTY'))
                    .map(([key, value]) => (
                      <div key={key} className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Database className="w-3 h-3" /> {key}</h5>
                        <p className="text-white font-semibold break-all">{String(value)}</p>
                      </div>
                  ))}
              </div>
              {isEditing && <button onClick={handleSave} disabled={isSaving} className={`w-full py-4 rounded-xl text-white font-black uppercase tracking-widest text-sm ${config.color} hover:opacity-90 transition-all shadow-xl active:scale-[0.99]`}>{isSaving ? "Salvando Alterações..." : "Salvar Registro"}</button>}
          </div>
      </div>
  );
};

const ItemCard: React.FC<{ item: GroupItem; config: any; onSelect: () => void; searchHighlight: string; }> = ({ item, config, onSelect, searchHighlight }) => {
  const data = item.data || {};
  const tagValue = data["Tag"] || item.content.split('|')[0].trim().replace(/^Item:\s*/i, '');
  const localValue = data["Local"] || "Local não especificado";
  
  return (
    <div 
      onClick={onSelect} 
      className="relative group flex flex-col h-full bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-slate-800/60 p-1 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer overflow-hidden ring-1 ring-inset ring-white/5 group-hover:-translate-y-1.5"
    >
      <div className="p-6 flex flex-col h-full gap-4 relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-black text-white truncate tracking-tighter leading-tight group-hover:text-blue-400 transition-colors uppercase">
              <HighlightedText text={tagValue} highlight={searchHighlight} />
            </h3>
          </div>
          <div className={`flex-shrink-0 w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 group-hover:bg-gradient-to-br ${config.gradient} group-hover:text-white transition-all duration-500 shadow-xl`}>
             <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div className="mt-auto space-y-2.5">
          <div className="flex items-center gap-2 text-slate-500 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-white/5 transition-colors group-hover:border-white/10">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold truncate tracking-tight">{localValue}</span>
          </div>
          
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 px-1 pt-1 border-t border-white/5 group-hover:text-slate-500">
             <div className="flex items-center gap-1.5 tracking-widest uppercase">{config.label}</div>
             <div>{item.createdAt ? 'REGISTRADO' : 'PENDENTE'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GroupPage: React.FC<{ groupKey: GroupType; user: User; onBack: () => void; plantMapUrl: string | null; }> = ({ groupKey, user, onBack, plantMapUrl }) => {
  const config = groupsConfig[groupKey];
  const Icon = config.icon;
  const [items, setItems] = useState<GroupItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GroupItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ tag: '', local: '', ip: '', equipamento: '', switch1: '', switch2: '', switch3: '' });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    try {
      const q = query(collection(db, groupKey), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as GroupItem[]);
      }, (err) => console.error("Erro no Snapshot:", err));
      return () => unsubscribe();
    } catch (e) { console.error("Erro ao iniciar coleção:", e); }
  }, [groupKey]);

  const handleGetLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGettingLocation(false); },
      () => { setGettingLocation(false); alert('Erro GPS'); },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: any = { 
        "Tag": formData.tag,
        "Local": formData.local,
        "IP / Equipamento": formData.ip,
      };

      if (groupKey === 'painel') {
        data["Switch 1"] = formData.switch1;
        data["Switch 2"] = formData.switch2;
        data["Switch 3"] = formData.switch3;
      }

      if (location) {
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
      setFormData({ tag: '', local: '', ip: '', equipamento: '', switch1: '', switch2: '', switch3: '' });
      setLocation(null);
    } catch (e) { alert('Erro ao salvar'); } finally { setLoading(false); }
  };

  const filteredItems = items.filter(item => {
    const s = searchTerm.toLowerCase();
    const tag = (item.data?.["Tag"] || "").toLowerCase();
    const local = (item.data?.["Local"] || "").toLowerCase();
    const ip = (item.data?.["IP / Equipamento"] || "").toLowerCase();
    return s === '' || tag.includes(s) || local.includes(s) || ip.includes(s) || item.content.toLowerCase().includes(s);
  });

  const displayItems = groupKey === 'embarcados' 
    ? [...filteredItems].sort((a, b) => {
        const tagA = (a.data?.["Tag"] || a.content).toLowerCase();
        const tagB = (b.data?.["Tag"] || b.content).toLowerCase();
        return tagA.localeCompare(tagB);
      })
    : filteredItems;

  if (selectedItem) return <ItemDetail item={selectedItem} groupKey={groupKey} config={config} user={user} onClose={() => setSelectedItem(null)} onDelete={(id) => deleteDoc(doc(db, groupKey, id)).then(() => setSelectedItem(null))} />;

  return (
    <div className="animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-slate-900/60 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${config.gradient} opacity-[0.03] blur-3xl -mr-32 -mt-32`}></div>
        
        <div className="flex items-center gap-6 relative z-10">
          <button onClick={onBack} className="p-3.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-[1.25rem] transition-all shadow-lg active:scale-90 border border-white/5"><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <div className="flex items-center gap-3 mb-1.5">
               <div className={`p-1.5 rounded-lg bg-gradient-to-br ${config.gradient} text-white shadow-lg shadow-blue-900/20`}><Icon className="w-4 h-4" /></div>
               <span className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-500">{config.label}</span>
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter">Tags Registradas</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <button onClick={() => setIsMapOpen(true)} className="flex items-center gap-3 px-6 py-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95">
            <MapIcon className="w-5 h-5" /> MAPA DA PLANTA
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="flex-1 relative group">
          <Search className="absolute left-5 top-5 h-5 w-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder={`Filtrar tags em ${config.label}...`} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-14 pr-6 py-5 bg-slate-900/40 border border-slate-800/50 rounded-[1.5rem] text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all backdrop-blur-md shadow-inner placeholder-slate-700 text-lg font-medium" 
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className={`flex items-center justify-center gap-3 px-10 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest text-white shadow-2xl shadow-blue-900/30 bg-gradient-to-r ${config.gradient} hover:scale-[1.02] transition-all active:scale-95`}
        >
          <Plus className="w-6 h-6" /> Novo Registro
        </button>
      </div>

      {displayItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn">
          {displayItems.map(item => <ItemCard key={item.id} item={item} config={config} onSelect={() => setSelectedItem(item)} searchHighlight={searchTerm} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-slate-900/20 rounded-[4rem] border-2 border-dashed border-slate-800/50">
           <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-700 mb-6 border border-white/5 animate-pulse">
             <Icon className="w-10 h-10" />
           </div>
           <h4 className="text-xl font-black text-slate-400 tracking-tight">Nenhuma tag encontrada</h4>
           <p className="text-slate-600 font-medium mt-1">A lista de equipamentos está vazia.</p>
        </div>
      )}

      {isMapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fadeIn">
          <div className="bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-800/50">
             <div className="p-8 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/80 backdrop-blur-md">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 shadow-inner"><MapIcon className="w-6 h-6" /></div>
                   <div>
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Visualização Técnica</span>
                      <h3 className="font-black text-white text-2xl tracking-tighter">Mapa Georreferenciado</h3>
                   </div>
                </div>
                <button onClick={() => setIsMapOpen(false)} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-[1.5rem] text-slate-400 hover:text-white transition-all shadow-xl active:scale-90"><X className="w-6 h-6" /></button>
             </div>
             <div className="flex-1 overflow-auto p-12 bg-slate-950 flex items-center justify-center">
                 {plantMapUrl ? <img src={plantMapUrl} className="max-w-full h-auto rounded-[2.5rem] shadow-2xl border-4 border-slate-800 ring-1 ring-white/10" /> : <div className="text-slate-500 text-center flex flex-col items-center"><ImageIcon className="w-24 h-24 opacity-5 mb-6" /><p className="text-xl font-bold tracking-tight">O mapa da planta não foi vinculado.</p><p className="text-sm text-slate-600 mt-2">Configure-o no menu de administração geral.</p></div>}
             </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-fadeIn">
          <div className="bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-lg border border-slate-800 overflow-y-auto max-h-[90vh] animate-slideUp">
            <div className={`p-10 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10 shadow-2xl`}>
              <div>
                <span className="text-[10px] uppercase tracking-widest font-black opacity-70">Cadastro de Inventário</span>
                <h3 className="text-3xl font-black tracking-tighter">Nova Tag</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-90"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-8">
              <button type="button" onClick={handleGetLocation} className={`w-full py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest flex justify-center items-center gap-3 transition-all ${location ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-blue-400 border border-slate-700 hover:bg-slate-750'}`}>
                {gettingLocation ? <Loader2 className="animate-spin w-5 h-5"/> : location ? <CheckCircle className="w-5 h-5"/> : <Navigation className="w-5 h-5"/>}
                {location ? "GPS: Posição capturada" : "Acionar Geolocalização GPS"}
              </button>
              
              <div className="space-y-5">
                <div className="space-y-2">
                   <label className="text-[10px] uppercase font-black text-slate-500 ml-2 tracking-widest flex items-center gap-1.5"><Hash className="w-3 h-3"/> Tag Principal</label>
                   <input type="text" placeholder="Ex: CTV-1029-NORTE" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-6 py-4 bg-slate-800/60 border border-slate-700 rounded-2xl text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 transition-all placeholder-slate-700 shadow-inner font-bold" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] uppercase font-black text-slate-500 ml-2 tracking-widest flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Localização</label>
                   <input type="text" placeholder="Ex: Sala de Servidores - Rack 04" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-6 py-4 bg-slate-800/60 border border-slate-700 rounded-2xl text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 transition-all placeholder-slate-700 shadow-inner font-bold" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] uppercase font-black text-slate-500 ml-2 tracking-widest flex items-center gap-1.5"><Database className="w-3 h-3"/> Endereçamento IP / ID</label>
                   <input type="text" placeholder="Ex: 10.20.30.150" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} className="w-full px-6 py-4 bg-slate-800/60 border border-slate-700 rounded-2xl text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 transition-all placeholder-slate-700 shadow-inner font-bold" />
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-6">
                <button type="submit" disabled={loading} className={`w-full py-5 rounded-[1.5rem] text-white bg-gradient-to-r ${config.gradient} font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-blue-900/30 transition-all active:scale-95 flex justify-center items-center gap-3`}>
                   {loading ? <Loader2 className="animate-spin w-6 h-6"/> : <><Plus className="w-5 h-5"/> Salvar Registro</>}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-2 text-slate-500 font-bold hover:text-slate-400 transition-colors text-sm uppercase tracking-widest">Descartar</button>
              </div>
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
  const [plantMapUrl, setPlantMapUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(doc(db, 'config', 'geral'), (docSnap) => {
        if (docSnap.exists()) {
          setPlantMapUrl(docSnap.data().mapaPlantaUrl || null);
        }
      }, (err) => console.warn("Doc config/geral não encontrado."));
      return () => unsubscribe();
    } catch (e) { console.error("Erro ao carregar config:", e); }
  }, []);

  const handleOpenGlobalMap = async () => {
    setLoadingMap(true);
    try {
      const colls = ['ctv', 'telecom', 'painel', 'embarcados'];
      const results = await Promise.all(colls.map(c => getDocs(collection(db, c)).catch(() => null)));
      const items = results.flatMap((snap, idx) => snap ? snap.docs.map(d => ({ id: d.id, ...d.data(), groupType: colls[idx] as GroupType })) : []);
      setAllMapItems(items as GroupItem[]);
      setIsMapModalOpen(true);
    } catch (e) { console.error(e); } finally { setLoadingMap(false); }
  };

  if (currentView !== 'home') return <div className="min-h-screen bg-slate-950 p-6 md:p-12"><div className="max-w-7xl mx-auto"><GroupPage groupKey={currentView} user={user} onBack={() => setCurrentView('home')} plantMapUrl={plantMapUrl} /></div></div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-white relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[180px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-5%] w-[50%] h-[50%] bg-indigo-600/10 blur-[180px] rounded-full pointer-events-none"></div>
      
      {isMapModalOpen && <GlobalMapModal items={allMapItems} onClose={() => setIsMapModalOpen(false)} />}
      
      <div className="max-w-6xl mx-auto space-y-20 animate-fadeIn relative z-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 pb-12 border-b border-slate-800/40">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-6 shadow-2xl">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></div>
              TagFinder Cloud Enterprise
            </div>
            <h1 className="text-6xl font-black tracking-tighter leading-none mb-3">Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-indigo-600">{user.displayName || user.email?.split('@')[0]}</span></h1>
            <p className="text-slate-500 text-xl font-medium tracking-tight">Onde a gestão de ativos encontra a agilidade técnica.</p>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={handleOpenGlobalMap} disabled={loadingMap} className="flex items-center gap-4 px-10 py-5 bg-slate-800/50 hover:bg-slate-700 hover:scale-[1.02] text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 border border-white/5 backdrop-blur-md">
               {loadingMap ? <Loader2 className="w-5 h-5 animate-spin"/> : <Globe className="w-6 h-6 text-blue-400 shadow-blue-500/50" />} Mapa Global
             </button>
             <button onClick={() => signOut(auth)} className="flex items-center gap-3 px-8 py-5 text-slate-500 hover:text-red-400 border border-slate-800/60 hover:border-red-500/30 rounded-3xl transition-all bg-slate-900/30 group active:scale-95">
               <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
             </button>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.entries(groupsConfig).map(([key, group]) => (
             <button 
                key={key} 
                onClick={() => setCurrentView(key as GroupType)} 
                className={`relative overflow-hidden group bg-slate-900/40 backdrop-blur-2xl p-12 rounded-[3.5rem] border border-slate-800/50 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-700 hover:-translate-y-4 ring-1 ring-inset ring-white/5`}
             >
               <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${group.gradient} opacity-[0.03] rounded-full -mr-24 -mt-24 group-hover:scale-[2] transition-transform duration-1000`}></div>
               
               <div className={`w-24 h-24 rounded-[2.5rem] ${group.lightColor} ${group.textColor} flex items-center justify-center mb-10 shadow-2xl shadow-black/40 group-hover:rotate-12 transition-transform duration-500 ring-4 ring-white/5`}>
                 <group.icon className="w-11 h-11" />
               </div>
               
               <h2 className="text-4xl font-black mb-4 tracking-tighter leading-none">{group.label}</h2>
               <div className={`inline-flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.3em] ${group.textColor} group-hover:translate-x-2 transition-transform duration-500`}>
                  Abrir Módulo <ArrowRight className="w-4 h-4" />
               </div>

               <div className={`absolute bottom-8 right-10 w-3 h-3 rounded-full ${group.color} opacity-10 group-hover:opacity-100 group-hover:scale-150 transition-all duration-700`}></div>
             </button>
          ))}
        </section>

        <footer className="pt-20 text-center">
           <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">&copy; 2024 TagFinder Intelligence Network</p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;