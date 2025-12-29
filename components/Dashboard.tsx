
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
// Added CheckCircle to imports
import { LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, MapPin, Loader2, Navigation, Edit, X, Globe, Trash2, Map as MapIcon, Crosshair, Server, ImageIcon, CheckCircle } from 'lucide-react';
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
    lightColor: 'bg-blue-900/30', borderColor: 'border-blue-800', gradient: 'from-blue-600 to-blue-800'
  },
  telecom: { 
    id: 'telecom', label: 'Telecom', icon: Radio, color: 'bg-indigo-600', textColor: 'text-indigo-400',
    lightColor: 'bg-indigo-900/30', borderColor: 'border-indigo-800', gradient: 'from-indigo-600 to-indigo-800'
  },
  painel: { 
    id: 'painel', label: 'Painéis', icon: Server, color: 'bg-orange-600', textColor: 'text-orange-400',
    lightColor: 'bg-orange-900/30', borderColor: 'border-orange-800', gradient: 'from-orange-600 to-orange-800'
  },
  embarcados: { 
    id: 'embarcados', label: 'Embarcados', icon: Cpu, color: 'bg-emerald-600', textColor: 'text-emerald-400',
    lightColor: 'bg-emerald-900/30', borderColor: 'border-emerald-800', gradient: 'from-emerald-600 to-emerald-800'
  },
};

const HighlightedText: React.FC<{ text: string; highlight: string; className?: string }> = ({ text, highlight, className = "" }) => {
  if (!highlight.trim()) return <span className={className}>{text}</span>;
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className={className}>
      {parts.map((part, i) => regex.test(part) ? (
        <span key={i} className="bg-yellow-500/40 text-yellow-100 rounded px-0.5 font-medium">{part}</span>
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

  return (
      <div className="bg-slate-900 min-h-[500px] rounded-3xl border border-slate-700 shadow-xl overflow-hidden flex flex-col animate-slideUp">
          <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10`}>
              <div className="flex items-center gap-4">
                  <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full"><ArrowLeft className="w-6 h-6" /></button>
                  <h2 className="text-xl font-bold">{isEditing ? "Editando" : (editData["Tag"] || item.content)}</h2>
              </div>
              <div className="flex gap-2">
                 {item.userId === user.uid && !isEditing && (
                     <><button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white/20 rounded-lg text-sm">Editar</button>
                       <button onClick={() => onDelete(item.id)} className="p-2 bg-white/20 rounded-lg"><Trash2 className="w-5 h-5" /></button></>
                 )}
                 {isEditing && <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-6 h-6" /></button>}
              </div>
          </div>
          <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex justify-between items-center">
                  <div><h4 className="font-bold text-white">GPS</h4><p className="text-sm text-slate-400">{location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : "Sem GPS"}</p></div>
                  {isEditing ? <button onClick={handleGetLocation} className="px-4 py-2 bg-blue-600 rounded-lg">{gettingLocation ? "Buscando..." : "Atualizar GPS"}</button> : location && <button onClick={() => window.open(`https://maps.google.com/?q=${location.lat},${location.lng}`, '_blank')} className="px-4 py-2 bg-green-600 rounded-lg">Ver no Maps</button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(editData).filter(([k]) => !k.toLowerCase().includes('geo') && !k.toLowerCase().includes('link')).map(([key, value]) => (
                      <div key={key} className="bg-slate-800 p-5 rounded-2xl border border-slate-700"><h5 className="text-xs font-bold text-slate-500 uppercase mb-2">{key}</h5><p className="text-white font-medium">{String(value)}</p></div>
                  ))}
              </div>
              {isEditing && <button onClick={handleSave} disabled={isSaving} className={`w-full py-4 rounded-xl text-white font-bold ${config.color}`}>{isSaving ? "Salvando..." : "Salvar Alterações"}</button>}
          </div>
      </div>
  );
};

const ItemCard: React.FC<{ item: GroupItem; config: any; onSelect: () => void; searchHighlight: string; }> = ({ item, config, onSelect, searchHighlight }) => {
  const Icon = config.icon;
  const data = item.data || {};
  const tagValue = data["Tag"] || item.content.replace(/^Item:\s*/i, '');
  const localValue = data["Local"] || "Sem Local";
  return (
    <div onClick={onSelect} className={`bg-slate-800 rounded-2xl border ${config.borderColor} shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col overflow-hidden group hover:-translate-y-1`}>
      <div className={`h-1.5 w-full bg-gradient-to-r ${config.gradient}`}></div>
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-4 overflow-hidden flex-1">
          <div className={`p-3 rounded-xl ${config.lightColor} ${config.textColor}`}><Icon className="w-6 h-6" /></div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white truncate"><HighlightedText text={tagValue} highlight={searchHighlight} /></h3>
            <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-0.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate"><HighlightedText text={localValue} highlight={searchHighlight} /></span></div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400" />
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
  const [formData, setFormData] = useState<any>({ tag: '', local: '', ip: '', equipamento: '' });
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
      const data: any = { ...formData };
      if (location) {
          data["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
          data["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      }
      await addDoc(collection(db, groupKey), { 
        content: `${groupKey.toUpperCase()}: ${formData.tag}`, 
        data, 
        userId: user.uid, 
        userEmail: user.email, 
        createdAt: serverTimestamp() 
      });
      setIsModalOpen(false);
      setFormData({ tag: '', local: '', ip: '', equipamento: '' });
      setLocation(null);
    } catch (e) { alert('Erro ao salvar'); } finally { setLoading(false); }
  };

  const filteredItems = items.filter(item => {
    const s = searchTerm.toLowerCase();
    return s === '' || (item.content.toLowerCase().includes(s) || Object.values(item.data || {}).some(v => String(v).toLowerCase().includes(s)));
  });

  if (selectedItem) return <ItemDetail item={selectedItem} groupKey={groupKey} config={config} user={user} onClose={() => setSelectedItem(null)} onDelete={(id) => deleteDoc(doc(db, groupKey, id)).then(() => setSelectedItem(null))} />;

  return (
    <div className="animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full"><ArrowLeft className="w-6 h-6" /></button>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${config.gradient} text-white`}><Icon className="w-6 h-6" /></div>
          <h2 className="text-2xl font-bold">{config.label}</h2>
        </div>
        <button onClick={() => setIsMapOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-900/30 border border-blue-800 text-blue-400 rounded-xl font-medium">
          <MapIcon className="w-4 h-4" /> Mapa da Planta
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
        <button onClick={() => setIsModalOpen(true)} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white shadow-md bg-gradient-to-r ${config.gradient}`}><Plus className="w-5 h-5" /> Novo Registro</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => <ItemCard key={item.id} item={item} config={config} onSelect={() => setSelectedItem(item)} searchHighlight={searchTerm} />)}
      </div>

      {isMapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-700">
             <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-white">Mapa da Planta</h3>
                <button onClick={() => setIsMapOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg"><X className="w-6 h-6 text-slate-400" /></button>
             </div>
             <div className="flex-1 overflow-auto p-4 bg-slate-950 flex items-center justify-center">
                 {plantMapUrl ? <img src={plantMapUrl} className="max-w-full h-auto rounded" /> : <div className="text-slate-500 text-center"><ImageIcon className="w-16 h-16 mx-auto opacity-20 mb-2" /><p>Mapa não configurado.</p></div>}
             </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700">
            <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center`}>
              <h3 className="text-xl font-bold">Novo {config.label}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <button type="button" onClick={handleGetLocation} className={`w-full py-3 rounded-lg text-sm font-medium flex justify-center items-center gap-2 ${location ? 'bg-green-600 text-white' : 'bg-slate-800 text-blue-400 border border-slate-700'}`}>
                {gettingLocation ? <Loader2 className="animate-spin w-5 h-5"/> : location ? <CheckCircle className="w-5 h-5"/> : <Navigation className="w-5 h-5"/>}
                {location ? "Localização Gravada" : "Ativar GPS e Gravar"}
              </button>
              <input type="text" placeholder="Tag" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <input type="text" placeholder="Localização" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <input type="text" placeholder="IP / Equipamento" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400">Cancelar</button>
                <button type="submit" disabled={loading} className={`px-6 py-2 rounded-lg text-white bg-gradient-to-r ${config.gradient} font-bold`}>{loading ? <Loader2 className="animate-spin w-5 h-5"/> : "Salvar"}</button>
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

  if (currentView !== 'home') return <div className="min-h-screen bg-slate-950 p-4 md:p-8"><div className="max-w-7xl mx-auto"><GroupPage groupKey={currentView} user={user} onBack={() => setCurrentView('home')} plantMapUrl={plantMapUrl} /></div></div>;

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-white">
      {isMapModalOpen && <GlobalMapModal items={allMapItems} onClose={() => setIsMapModalOpen(false)} />}
      <div className="max-w-5xl mx-auto space-y-12 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
          <div><h1 className="text-4xl font-extrabold">Olá, <span className="text-indigo-400">{user.displayName || user.email?.split('@')[0]}</span></h1><p className="text-slate-400 mt-2">Central de Gerenciamento TagFinder</p></div>
          <div className="flex gap-3">
             <button onClick={handleOpenGlobalMap} disabled={loadingMap} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md">{loadingMap ? <Loader2 className="w-5 h-5 animate-spin"/> : <Globe className="w-5 h-5" />} Mapa Global</button>
             <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-5 py-2.5 text-slate-300 hover:text-red-400 border border-slate-700 rounded-xl"><LogOut className="w-5 h-5" /> Sair</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(groupsConfig).map(([key, group]) => (
             <button key={key} onClick={() => setCurrentView(key as GroupType)} className={`relative overflow-hidden group bg-slate-800 p-8 rounded-3xl border ${group.borderColor} hover:shadow-xl transition-all hover:-translate-y-2`}>
               <div className={`w-16 h-16 rounded-2xl ${group.lightColor} ${group.textColor} flex items-center justify-center mb-6`}><group.icon className="w-8 h-8" /></div>
               <h2 className="text-2xl font-bold mb-2">{group.label}</h2>
               <div className={`inline-flex items-center gap-2 font-semibold ${group.textColor}`}>Acessar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></div>
             </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
